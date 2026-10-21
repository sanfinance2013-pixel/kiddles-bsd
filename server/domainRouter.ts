import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  activityLogs,
  attendance,
  invoices,
  paymentEvidence,
  sessions,
  students,
  teacherPayouts,
} from "../drizzle/schema";
import { managerProcedure, protectedProcedure, router, staffProcedure } from "./_core/trpc";
import { getDb } from "./db";

const unavailable = () => new TRPCError({ code: "PRECONDITION_FAILED", message: "Database belum tersedia pada environment ini." });
const staffId = z.number().int().positive();

export const domainRouter = router({
  students: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select().from(students).orderBy(desc(students.createdAt)).limit(input?.limit ?? 50);
        const search = input?.search?.toLowerCase();
        return search ? rows.filter((student) => `${student.fullName} ${student.studentNo} ${student.guardianName}`.toLowerCase().includes(search)) : rows;
      }),
    create: managerProcedure
      .input(z.object({ fullName: z.string().trim().min(2).max(160), guardianName: z.string().trim().min(2).max(160), guardianPhone: z.string().trim().max(32).optional(), program: z.string().trim().min(2).max(80), remainingSessions: z.number().int().min(0).max(999).default(0) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const studentNo = `KBS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const result = await db.insert(students).values({ ...input, studentNo, guardianPhone: input.guardianPhone || null });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "student", entityId: Number(result[0].insertId), action: "created" });
        return { studentNo, id: Number(result[0].insertId) };
      }),
  }),

  billing: router({
    listInvoices: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(invoices).where(isNull(invoices.deletedAt)).orderBy(desc(invoices.createdAt)).limit(100);
    }),
    createInvoice: managerProcedure
      .input(z.object({ studentId: staffId, subtotal: z.number().int().min(0), discount: z.number().int().min(0).default(0), adminFee: z.number().int().min(0).default(0), tax: z.number().int().min(0).default(0), dueDate: z.coerce.date() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        if (input.discount > input.subtotal) throw new TRPCError({ code: "BAD_REQUEST", message: "Diskon tidak boleh melebihi subtotal." });
        const total = input.subtotal - input.discount + input.adminFee + input.tax;
        const invoiceNumber = `INV-KL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`;
        const result = await db.insert(invoices).values({ ...input, invoiceNumber, total, paidAmount: 0, status: "unpaid" });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "invoice", entityId: Number(result[0].insertId), action: "created", metadata: JSON.stringify({ invoiceNumber, total }) });
        return { id: Number(result[0].insertId), invoiceNumber, total };
      }),
  }),

  payments: router({
    listEvidence: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(paymentEvidence).where(isNull(paymentEvidence.deletedAt)).orderBy(desc(paymentEvidence.createdAt)).limit(100);
    }),
    submitEvidence: protectedProcedure
      .input(z.object({ invoiceId: staffId, objectKey: z.string().regex(/^[A-Za-z0-9_./-]{3,255}$/), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), amount: z.number().int().positive(), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const stableUrl = `/manus-storage/${input.objectKey}`;
        const result = await db.insert(paymentEvidence).values({ ...input, stableUrl, status: "pending", note: input.note || null, createdBy: ctx.user.id });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "payment_evidence", entityId: Number(result[0].insertId), action: "submitted", metadata: JSON.stringify({ invoiceId: input.invoiceId }) });
        return { id: Number(result[0].insertId), stableUrl };
      }),
    reviewEvidence: managerProcedure
      .input(z.object({ evidenceId: staffId, status: z.enum(["approved", "rejected", "review"]), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const evidence = await db.select().from(paymentEvidence).where(eq(paymentEvidence.id, input.evidenceId)).limit(1);
        if (!evidence[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Bukti pembayaran tidak ditemukan." });
        if (evidence[0].status === "approved") throw new TRPCError({ code: "CONFLICT", message: "Bukti pembayaran sudah disetujui." });
        await db.update(paymentEvidence).set({ status: input.status, note: input.note || evidence[0].note, reviewedBy: ctx.user.id, reviewedAt: new Date() }).where(eq(paymentEvidence.id, input.evidenceId));
        if (input.status === "approved") {
          const invoice = await db.select().from(invoices).where(eq(invoices.id, evidence[0].invoiceId)).limit(1);
          if (invoice[0]) {
            const paidAmount = invoice[0].paidAmount + evidence[0].amount;
            const status = paidAmount >= invoice[0].total ? "paid" : "partial";
            await db.update(invoices).set({ paidAmount, status }).where(eq(invoices.id, invoice[0].id));
          }
        }
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "payment_evidence", entityId: input.evidenceId, action: `reviewed:${input.status}` });
        return { success: true };
      }),
  }),

  schedule: router({
    upcoming: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(sessions).where(isNull(sessions.deletedAt)).orderBy(sessions.startsAt).limit(50);
    }),
    setQrStatus: staffProcedure
      .input(z.object({ sessionId: staffId, qrStatus: z.enum(["inactive", "active", "closed", "cancelled"]) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [session] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Pertemuan tidak ditemukan." });
        const now = new Date();
        await db.update(sessions).set({ qrStatus: input.qrStatus, qrActivatedAt: input.qrStatus === "active" ? now : session.qrActivatedAt, qrClosedAt: input.qrStatus === "closed" ? now : session.qrClosedAt, status: input.qrStatus === "active" ? "active" : session.status }).where(eq(sessions.id, input.sessionId));
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "session", entityId: input.sessionId, action: `qr:${input.qrStatus}` });
        return { success: true };
      }),
  }),

  attendance: router({
    record: staffProcedure
      .input(z.object({ sessionId: staffId, studentId: staffId, status: z.enum(["present", "excused", "sick", "absent"]), source: z.enum(["qr", "manual"]).default("qr") }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [session] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
        if (!session || session.deletedAt || session.qrStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "QR sesi belum aktif atau sudah ditutup." });
        const [existing] = await db.select().from(attendance).where(and(eq(attendance.sessionId, input.sessionId), eq(attendance.studentId, input.studentId), isNull(attendance.deletedAt))).limit(1);
        if (existing) return { success: true, duplicate: true, attendanceId: existing.id };
        const result = await db.insert(attendance).values({ ...input, recordedBy: ctx.user.id });
        if (input.status === "present") {
          const [student] = await db.select().from(students).where(eq(students.id, input.studentId)).limit(1);
          if (student && student.remainingSessions > 0) await db.update(students).set({ remainingSessions: student.remainingSessions - 1 }).where(eq(students.id, input.studentId));
        }
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "attendance", entityId: Number(result[0].insertId), action: "recorded", metadata: JSON.stringify(input) });
        return { success: true, duplicate: false, attendanceId: Number(result[0].insertId) };
      }),
  }),

  payroll: router({
    list: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(teacherPayouts).where(isNull(teacherPayouts.deletedAt)).orderBy(desc(teacherPayouts.createdAt)).limit(100);
    }),
  }),
});
