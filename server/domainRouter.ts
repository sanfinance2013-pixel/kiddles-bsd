import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import {
  activityLogs,
  attendance,
  chartOfAccounts,
  invoices,
  journalEntries,
  journalLines,
  paymentEvidence,
  procurements,
  sessions,
  studentQrTokens,
  students,
  teacherPayouts,
} from "../drizzle/schema";
import { managerProcedure, protectedProcedure, router, staffProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { storagePut } from "./storage";

const unavailable = () => new TRPCError({ code: "PRECONDITION_FAILED", message: "Database belum tersedia pada environment ini." });
const staffId = z.number().int().positive();
const hashQrToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newQrToken = () => `KBSQR.${randomBytes(24).toString("base64url")}`;
const isWithinSessionWindow = (session: { startsAt: Date; endsAt: Date }, now = new Date()) => now >= session.startsAt && now <= session.endsAt;
const isDuplicateKeyError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? (error as { code?: string }).code : undefined;
  return code === "ER_DUP_ENTRY" || String(error).includes("Duplicate entry");
};

const defaultAccounts = [
  { code: "1101", name: "Kas", accountType: "asset" as const, normalBalance: "debit" as const },
  { code: "1102", name: "Bank", accountType: "asset" as const, normalBalance: "debit" as const },
  { code: "1201", name: "Peralatan belajar", accountType: "asset" as const, normalBalance: "debit" as const },
  { code: "2101", name: "Utang usaha", accountType: "liability" as const, normalBalance: "credit" as const },
  { code: "3101", name: "Modal pemilik", accountType: "equity" as const, normalBalance: "credit" as const },
  { code: "4101", name: "Pendapatan kursus", accountType: "revenue" as const, normalBalance: "credit" as const },
  { code: "5101", name: "Beban operasional", accountType: "expense" as const, normalBalance: "debit" as const },
  { code: "5102", name: "Beban bahan ajar", accountType: "expense" as const, normalBalance: "debit" as const },
  { code: "5103", name: "Beban marketing", accountType: "expense" as const, normalBalance: "debit" as const },
  { code: "5104", name: "Beban kebersihan & utilitas", accountType: "expense" as const, normalBalance: "debit" as const },
];

async function ensureDefaultAccounts(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const existing = await db.select().from(chartOfAccounts).limit(1);
  if (existing.length === 0) await db.insert(chartOfAccounts).values(defaultAccounts);
  return db.select().from(chartOfAccounts).where(eq(chartOfAccounts.isActive, 1)).orderBy(chartOfAccounts.code);
}

async function postProcurementJournal(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { id: number; itemName: string; total: number; purchaseDate: Date; paymentMethod: "cash" | "bank" | "payable"; expenseAccountId: number; assetAccountId: number | null; category: string }, userId: number) {
  const [existing] = await db.select().from(journalEntries).where(and(eq(journalEntries.referenceType, "procurement"), eq(journalEntries.referenceId, input.id))).limit(1);
  if (existing) return existing.id;
  const entryNumber = `JE-KBS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`;
  const entry = await db.insert(journalEntries).values({ entryNumber, entryDate: input.purchaseDate, referenceType: "procurement", referenceId: input.id, description: `Pembelian ${input.itemName}`, status: "posted", createdBy: userId });
  const journalEntryId = Number(entry[0].insertId);
  const debitAccountId = input.category === "aset_peralatan" && input.assetAccountId ? input.assetAccountId : input.expenseAccountId;
  const creditCode = input.paymentMethod === "cash" ? "1101" : input.paymentMethod === "bank" ? "1102" : "2101";
  const [creditAccount] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, creditCode)).limit(1);
  if (!creditAccount) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Akun lawan transaksi belum tersedia." });
  await db.insert(journalLines).values([
    { journalEntryId, accountId: debitAccountId, debit: input.total, credit: 0, memo: input.itemName },
    { journalEntryId, accountId: creditAccount.id, debit: 0, credit: input.total, memo: input.paymentMethod === "payable" ? "Dicatat sebagai utang usaha" : "Pembayaran pembelian" },
  ]);
  await db.insert(activityLogs).values({ actorUserId: userId, entityType: "journal_entry", entityId: journalEntryId, action: "posted", metadata: JSON.stringify({ referenceType: "procurement", procurementId: input.id, entryNumber }) });
  return journalEntryId;
}

export const domainRouter = router({
  assistant: router({
    chat: protectedProcedure
      .input(z.object({
        page: z.string().trim().max(80).default("Dashboard"),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(12),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "AI Personal Assistant tersedia untuk Owner dan Admin." });
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 800,
          messages: [
            {
              role: "system",
              content: `Kamu adalah "Kak KIDDLES", AI Personal Assistant untuk sistem operasional KIDDLES BSD. Kamu membantu ${ctx.user.role === "owner" ? "Owner" : "Admin"} di halaman ${input.page}. Gunakan bahasa Indonesia yang sopan, hangat, sabar, dan sangat mudah dimengerti. Jawaban singkat namun jelas, gunakan poin atau langkah bernomor bila membantu. Jelaskan istilah teknis dengan bahasa biasa. Jangan mengarang angka, data murid, status pembayaran, aturan pajak, atau jadwal yang tidak diberikan. Jika pertanyaan memerlukan akses data langsung atau tindakan yang belum tersedia, katakan dengan jujur dan arahkan menu yang tepat. Jangan meminta password, token, nomor kartu, atau data sensitif. Untuk masalah pembayaran, absensi, atau data murid, ingatkan pengguna untuk memeriksa detail sebelum menyimpan perubahan. Jangan mengaku sebagai manusia atau menjanjikan tindakan otomatis yang belum dilakukan.`,
            },
            ...input.messages.map((message) => ({ role: message.role, content: message.content })),
          ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Asisten belum memberikan jawaban. Silakan coba lagi." });
        return { content };
      }),
  }),

  accounting: router({
    listAccounts: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return ensureDefaultAccounts(db);
    }),
    listJournal: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(journalEntries).orderBy(desc(journalEntries.entryDate)).limit(100);
    }),
    summary: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { accounts: [], lines: [] };
      const accounts = await ensureDefaultAccounts(db);
      const lines = await db.select().from(journalLines).orderBy(desc(journalLines.createdAt)).limit(500);
      return { accounts, lines };
    }),
  }),

  procurement: router({
    list: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(procurements).where(isNull(procurements.deletedAt)).orderBy(desc(procurements.purchaseDate)).limit(100);
    }),
    create: managerProcedure
      .input(z.object({
        vendorName: z.string().trim().min(2).max(160),
        itemName: z.string().trim().min(2).max(200),
        category: z.enum(["operasional", "aset_peralatan", "bahan_ajar", "marketing", "kebersihan", "teknologi", "lainnya"]),
        purchaseDate: z.coerce.date(),
        subtotal: z.number().int().positive(),
        tax: z.number().int().min(0).default(0),
        paymentMethod: z.enum(["cash", "bank", "payable"]),
        expenseAccountId: staffId,
        assetAccountId: staffId.nullish(),
        note: z.string().trim().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const accounts = await ensureDefaultAccounts(db);
        const selectedDebit = accounts.find((account) => account.id === input.expenseAccountId);
        if (!selectedDebit) throw new TRPCError({ code: "BAD_REQUEST", message: "Akun biaya yang dipilih tidak ditemukan." });
        const total = input.subtotal + input.tax;
        const purchaseNumber = `PO-KBS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`;
        const result = await db.insert(procurements).values({ ...input, purchaseNumber, total, assetAccountId: input.assetAccountId ?? null, note: input.note || null, status: "approved", createdBy: ctx.user.id, approvedBy: ctx.user.id, approvedAt: new Date() });
        const id = Number(result[0].insertId);
        await postProcurementJournal(db, { id, itemName: input.itemName, total, purchaseDate: input.purchaseDate, paymentMethod: input.paymentMethod, expenseAccountId: input.expenseAccountId, assetAccountId: input.assetAccountId ?? null, category: input.category }, ctx.user.id);
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "procurement", entityId: id, action: "created_and_posted", metadata: JSON.stringify({ purchaseNumber, category: input.category, total }) });
        return { id, purchaseNumber, total, status: "approved" as const };
      }),
  }),

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
    issueQrToken: managerProcedure
      .input(z.object({ studentId: staffId }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), isNull(students.deletedAt))).limit(1);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Murid tidak ditemukan." });
        const rawToken = newQrToken();
        const tokenHash = hashQrToken(rawToken);
        const [existing] = await db.select().from(studentQrTokens).where(eq(studentQrTokens.studentId, input.studentId)).limit(1);
        if (existing) await db.update(studentQrTokens).set({ tokenHash, status: "active" }).where(eq(studentQrTokens.id, existing.id));
        else await db.insert(studentQrTokens).values({ studentId: input.studentId, tokenHash, status: "active" });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "student_qr", entityId: input.studentId, action: "issued" });
        return { studentId: input.studentId, token: rawToken };
      }),
    revokeQrToken: managerProcedure
      .input(z.object({ studentId: staffId }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        await db.update(studentQrTokens).set({ status: "revoked" }).where(eq(studentQrTokens.studentId, input.studentId));
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "student_qr", entityId: input.studentId, action: "revoked" });
        return { success: true };
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
    uploadEvidence: protectedProcedure
      .input(z.object({ invoiceId: staffId, fileName: z.string().trim().min(3).max(160), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), dataBase64: z.string().min(100).max(14_000_000), amount: z.number().int().positive(), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const raw = input.dataBase64.replace(/^data:[^;]+;base64,/, "");
        const bytes = Buffer.from(raw, "base64");
        if (bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Ukuran bukti pembayaran maksimal 10 MB." });
        const safeName = input.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
        const stored = await storagePut(`kiddles/payment-evidence/${Date.now()}-${safeName}`, bytes, input.mimeType);
        const result = await db.insert(paymentEvidence).values({ invoiceId: input.invoiceId, objectKey: stored.key, stableUrl: stored.url, mimeType: input.mimeType, amount: input.amount, status: "pending", note: input.note || null, createdBy: ctx.user.id });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "payment_evidence", entityId: Number(result[0].insertId), action: "uploaded", metadata: JSON.stringify({ invoiceId: input.invoiceId, mimeType: input.mimeType, bytes: bytes.length }) });
        return { id: Number(result[0].insertId), stableUrl: stored.url };
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
        if (input.qrStatus === "active" && !isWithinSessionWindow(session, now)) throw new TRPCError({ code: "FORBIDDEN", message: "QR hanya dapat diaktifkan pada jam kelas yang terjadwal." });
        await db.update(sessions).set({ qrStatus: input.qrStatus, qrActivatedAt: input.qrStatus === "active" ? now : session.qrActivatedAt, qrClosedAt: input.qrStatus === "closed" ? now : session.qrClosedAt, status: input.qrStatus === "active" ? "active" : session.status }).where(eq(sessions.id, input.sessionId));
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "session", entityId: input.sessionId, action: `qr:${input.qrStatus}` });
        return { success: true };
      }),
  }),

  attendance: router({
    recordByQrToken: staffProcedure
      .input(z.object({ sessionId: staffId, token: z.string().trim().min(12).max(200), status: z.enum(["present", "excused", "sick", "absent"]).default("present") }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [session] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
        if (!session || session.deletedAt || session.qrStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "QR sesi belum aktif atau sudah ditutup." });
        if (!isWithinSessionWindow(session)) throw new TRPCError({ code: "FORBIDDEN", message: "QR hanya aktif selama jam kelas yang terjadwal." });
        if (ctx.user.role === "teacher" && session.teacherUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Guru tidak ditugaskan pada sesi ini." });
        const [qr] = await db.select().from(studentQrTokens).where(and(eq(studentQrTokens.tokenHash, hashQrToken(input.token)), eq(studentQrTokens.status, "active"))).limit(1);
        if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR murid tidak valid atau sudah dicabut." });
        const [existing] = await db.select().from(attendance).where(and(eq(attendance.sessionId, input.sessionId), eq(attendance.studentId, qr.studentId), isNull(attendance.deletedAt))).limit(1);
        if (existing) return { success: true, duplicate: true, attendanceId: existing.id, studentId: qr.studentId };
        let result;
        try {
          result = await db.insert(attendance).values({ sessionId: input.sessionId, studentId: qr.studentId, status: input.status, source: "qr", recordedBy: ctx.user.id });
        } catch (error) {
          if (!isDuplicateKeyError(error)) throw error;
          const [duplicate] = await db.select().from(attendance).where(and(eq(attendance.sessionId, input.sessionId), eq(attendance.studentId, qr.studentId))).limit(1);
          if (duplicate) return { success: true, duplicate: true, attendanceId: duplicate.id, studentId: qr.studentId };
          throw error;
        }
        if (input.status === "present") {
          const [student] = await db.select().from(students).where(eq(students.id, qr.studentId)).limit(1);
          if (student && student.remainingSessions > 0) await db.update(students).set({ remainingSessions: student.remainingSessions - 1 }).where(eq(students.id, qr.studentId));
        }
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "attendance", entityId: Number(result[0].insertId), action: "recorded:qr", metadata: JSON.stringify({ sessionId: input.sessionId, studentId: qr.studentId, status: input.status }) });
        return { success: true, duplicate: false, attendanceId: Number(result[0].insertId), studentId: qr.studentId };
      }),
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
