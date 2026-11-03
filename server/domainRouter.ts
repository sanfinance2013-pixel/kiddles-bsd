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
  leads,
  packages,
  paymentEvidence,
  procurements,
  sessions,
  studentQrTokens,
  students,
  taxProfiles,
  taxReports,
  taxTransactions,
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

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const periodInput = z.string().regex(periodPattern, "Periode harus berformat YYYY-MM.");
const periodBounds = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
};
const taxDueDate = (period: string, taxType: string) => {
  const [year, month] = period.split("-").map(Number);
  if (taxType === "ppn_keluaran" || taxType === "ppn_masukan") return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  return new Date(Date.UTC(year, month, 20, 23, 59, 59));
};

export const domainRouter = router({
  crm: router({
    list: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.createdAt)).limit(500);
    }),
    create: managerProcedure
      .input(z.object({ fullName: z.string().trim().min(2).max(160), guardianName: z.string().trim().min(2).max(160), guardianPhone: z.string().trim().max(32).optional(), program: z.string().trim().min(2).max(80), source: z.string().trim().max(80).default("Tidak diketahui"), trialAt: z.coerce.date().nullish(), followUpAt: z.coerce.date().nullish(), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const result = await db.insert(leads).values({ ...input, guardianPhone: input.guardianPhone || null, trialAt: input.trialAt ?? null, followUpAt: input.followUpAt ?? null, note: input.note || null });
        const id = Number(result[0].insertId);
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "lead", entityId: id, action: "created" });
        return { id };
      }),
    updateStatus: managerProcedure
      .input(z.object({ leadId: staffId, status: z.enum(["new", "contacted", "trial_scheduled", "trial_done", "enrolled", "lost"]) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        await db.update(leads).set({ status: input.status }).where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt)));
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "lead", entityId: input.leadId, action: `status:${input.status}` });
        return { success: true };
      }),
    convertToStudent: managerProcedure
      .input(z.object({ leadId: staffId, remainingSessions: z.number().int().min(0).max(999).default(0) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [lead] = await db.select().from(leads).where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt))).limit(1);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead tidak ditemukan." });
        if (lead.convertedStudentId) return { id: lead.convertedStudentId, duplicate: true };
        const studentNo = `KBS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const result = await db.insert(students).values({ studentNo, fullName: lead.fullName, guardianName: lead.guardianName, guardianPhone: lead.guardianPhone, program: lead.program, remainingSessions: input.remainingSessions, classStatus: "active" });
        const studentId = Number(result[0].insertId);
        await db.update(leads).set({ status: "enrolled", convertedStudentId: studentId }).where(eq(leads.id, lead.id));
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "lead", entityId: lead.id, action: "converted_to_student", metadata: JSON.stringify({ studentId }) });
        return { id: studentId, duplicate: false };
      }),
  }),
  assistant: router({
    chat: protectedProcedure
      .input(z.object({
        page: z.string().trim().max(80).default("Dashboard"),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(12),
      }))
      .mutation(async ({ input, ctx }) => {
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 800,
          messages: [
            {
              role: "system",
              content: `Kamu adalah "Kak KIDDLES", customer support yang sabar untuk sistem operasional KIDDLES BSD. Kamu membantu pengguna dengan role ${ctx.user.role} di halaman ${input.page}. Gunakan bahasa Indonesia yang sopan, hangat, sabar, dan sangat mudah dimengerti. Jawaban singkat namun jelas, gunakan poin atau langkah bernomor bila membantu. Jelaskan istilah teknis dengan bahasa biasa. Sesuaikan jawaban: Owner membutuhkan ringkasan bisnis dan kontrol; Admin membutuhkan langkah operasional; Guru membutuhkan jadwal, absensi, dan kelas; Murid/Orang Tua membutuhkan jadwal, sisa sesi, invoice, dan pembayaran. Jangan mengarang angka, data murid, status pembayaran, aturan pajak, atau jadwal yang tidak diberikan. Jika pertanyaan memerlukan akses data langsung atau tindakan yang belum tersedia, katakan dengan jujur dan arahkan menu yang tepat. Jangan meminta password, token, nomor kartu, atau data sensitif. Untuk masalah pembayaran, absensi, procurement, atau data murid, ingatkan pengguna untuk memeriksa detail sebelum menyimpan perubahan. Jangan mengaku sebagai manusia atau menjanjikan tindakan otomatis yang belum dilakukan.`,
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
    monthlyReport: managerProcedure
      .input(z.object({ period: periodInput }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { period: input.period, accounts: [], entries: [], lines: [], revenue: 0, expense: 0, netIncome: 0, assets: 0, liabilities: 0 };
        const { start, end } = periodBounds(input.period);
        const accounts = await ensureDefaultAccounts(db);
        const entries = await db.select().from(journalEntries).where(eq(journalEntries.status, "posted")).orderBy(desc(journalEntries.entryDate)).limit(500);
        const periodEntries = entries.filter((entry) => entry.entryDate >= start && entry.entryDate < end);
        const entryIds = new Set(periodEntries.map((entry) => entry.id));
        const allLines = await db.select().from(journalLines).orderBy(desc(journalLines.createdAt)).limit(1000);
        const lines = allLines.filter((line) => entryIds.has(line.journalEntryId));
        const byType = (type: string) => lines.filter((line) => accounts.find((account) => account.id === line.accountId)?.accountType === type).reduce((total, line) => total + line.debit - line.credit, 0);
        const revenue = Math.max(0, -byType("revenue"));
        const expense = Math.max(0, byType("expense"));
        return { period: input.period, accounts, entries: periodEntries, lines, revenue, expense, netIncome: revenue - expense, assets: byType("asset"), liabilities: Math.max(0, -byType("liability")) };
      }),
  }),

  tax: router({
    profile: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const [profile] = await db.select().from(taxProfiles).orderBy(desc(taxProfiles.updatedAt)).limit(1);
      return profile ?? null;
    }),
    saveProfile: managerProcedure
      .input(z.object({
        taxpayerName: z.string().trim().min(2).max(200),
        npwp: z.string().trim().max(32).optional(),
        nitku: z.string().trim().max(32).optional(),
        entityType: z.enum(["orang_pribadi", "pt", "cv", "koperasi", "lainnya"]),
        taxRegime: z.enum(["umkm_final_05", "general_corporate_22", "personal_progressive", "custom"]),
        isPkp: z.boolean(),
        educationLicenseVerified: z.boolean(),
        vatTreatment: z.enum(["non_ppn_education", "ppn_11", "ppn_12_luxury", "custom"]),
        customPphRateBps: z.number().int().min(0).max(10000).nullish(),
        customVatRateBps: z.number().int().min(0).max(10000).nullish(),
        taxYear: z.number().int().min(2020).max(2100),
        notes: z.string().trim().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [existing] = await db.select().from(taxProfiles).limit(1);
        const values = { ...input, npwp: input.npwp || null, nitku: input.nitku || null, isPkp: input.isPkp ? 1 : 0, educationLicenseVerified: input.educationLicenseVerified ? 1 : 0, customPphRateBps: input.customPphRateBps ?? null, customVatRateBps: input.customVatRateBps ?? null, notes: input.notes || null };
        if (existing) await db.update(taxProfiles).set(values).where(eq(taxProfiles.id, existing.id));
        else await db.insert(taxProfiles).values(values);
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "tax_profile", entityId: existing?.id ?? null, action: "saved" });
        return { success: true };
      }),
    listTransactions: managerProcedure
      .input(z.object({ period: periodInput }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(taxTransactions).where(and(eq(taxTransactions.period, input.period), isNull(taxTransactions.deletedAt))).orderBy(desc(taxTransactions.createdAt)).limit(500);
      }),
    addTransaction: managerProcedure
      .input(z.object({ period: periodInput, taxType: z.enum(["pph21", "pph23", "pph_final_umkm", "pph_badan", "ppn_keluaran", "ppn_masukan", "materai", "other"]), counterpartyName: z.string().trim().max(180).optional(), taxBase: z.number().int().min(0), rateBps: z.number().int().min(0).max(10000), note: z.string().trim().max(500).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const taxAmount = Math.round(input.taxBase * input.rateBps / 10000);
        const result = await db.insert(taxTransactions).values({ ...input, counterpartyName: input.counterpartyName || null, taxAmount, status: "ready", note: input.note || null, createdBy: ctx.user.id });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "tax_transaction", entityId: Number(result[0].insertId), action: "created", metadata: JSON.stringify({ period: input.period, taxType: input.taxType, taxAmount }) });
        return { id: Number(result[0].insertId), taxAmount };
      }),
    monthlyReport: managerProcedure
      .input(z.object({ period: periodInput }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { period: input.period, profile: null, transactions: [], byType: [], totalTax: 0 };
        const [profile] = await db.select().from(taxProfiles).orderBy(desc(taxProfiles.updatedAt)).limit(1);
        const transactions = await db.select().from(taxTransactions).where(and(eq(taxTransactions.period, input.period), isNull(taxTransactions.deletedAt))).orderBy(desc(taxTransactions.createdAt)).limit(500);
        const types = ["pph21", "pph23", "pph_final_umkm", "pph_badan", "ppn_keluaran", "ppn_masukan", "materai", "other"] as const;
        const byType = types.map((taxType) => { const rows = transactions.filter((item) => item.taxType === taxType); return { taxType, taxBase: rows.reduce((sum, row) => sum + row.taxBase, 0), taxAmount: rows.reduce((sum, row) => sum + row.taxAmount, 0), dueDate: taxDueDate(input.period, taxType) }; }).filter((item) => item.taxBase > 0 || item.taxAmount > 0);
        return { period: input.period, profile: profile ?? null, transactions, byType, totalTax: transactions.reduce((sum, item) => sum + item.taxAmount, 0) };
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
      const [rows, studentRows, packageRows] = await Promise.all([
        db.select().from(invoices).where(isNull(invoices.deletedAt)).orderBy(desc(invoices.createdAt)).limit(100),
        db.select().from(students),
        db.select().from(packages),
      ]);
      return rows.map((invoice) => ({ ...invoice, student: studentRows.find((student) => student.id === invoice.studentId) ?? null, package: packageRows.find((item) => item.id === invoice.packageId) ?? null }));
    }),
    packages: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(packages).where(eq(packages.isActive, 1)).orderBy(packages.name);
    }),
    activeClassCandidates: managerProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: students.id, studentNo: students.studentNo, fullName: students.fullName, program: students.program, remainingSessions: students.remainingSessions }).from(students).where(and(eq(students.status, "active"), eq(students.classStatus, "active"), isNull(students.deletedAt))).orderBy(students.fullName).limit(500);
    }),
    createInvoice: managerProcedure
      .input(z.object({ studentId: staffId, packageId: staffId.nullish(), subtotal: z.number().int().min(0), discount: z.number().int().min(0).default(0), adminFee: z.number().int().min(0).default(0), tax: z.number().int().min(0).default(0), dueDate: z.coerce.date() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [student] = await db.select({ id: students.id, status: students.status, deletedAt: students.deletedAt }).from(students).where(eq(students.id, input.studentId)).limit(1);
        if (!student || student.deletedAt || student.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice hanya dapat dibuat untuk murid aktif." });
        let serverSubtotal = input.subtotal;
        if (input.packageId) {
          const [selectedPackage] = await db.select({ price: packages.price, isActive: packages.isActive }).from(packages).where(eq(packages.id, input.packageId)).limit(1);
          if (!selectedPackage || selectedPackage.isActive !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Paket aktif tidak ditemukan." });
          serverSubtotal = selectedPackage.price;
        }
        if (input.discount > serverSubtotal) throw new TRPCError({ code: "BAD_REQUEST", message: "Diskon tidak boleh melebihi subtotal." });
        const total = serverSubtotal - input.discount + input.adminFee + input.tax;
        const invoiceNumber = `INV-KL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`;
        const result = await db.insert(invoices).values({ studentId: input.studentId, packageId: input.packageId ?? null, subtotal: serverSubtotal, discount: input.discount, adminFee: input.adminFee, tax: input.tax, dueDate: input.dueDate, invoiceNumber, total, paidAmount: 0, status: "unpaid" });
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "invoice", entityId: Number(result[0].insertId), action: "created", metadata: JSON.stringify({ invoiceNumber, total }) });
        return { id: Number(result[0].insertId), invoiceNumber, total };
      }),
    generateForActiveClass: managerProcedure
      .input(z.object({ packageId: staffId, dueDate: z.coerce.date(), discount: z.number().int().min(0).default(0), adminFee: z.number().int().min(0).default(0), tax: z.number().int().min(0).default(0) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [selectedPackage] = await db.select().from(packages).where(and(eq(packages.id, input.packageId), eq(packages.isActive, 1))).limit(1);
        if (!selectedPackage) throw new TRPCError({ code: "NOT_FOUND", message: "Paket aktif tidak ditemukan." });
        if (input.discount > selectedPackage.price) throw new TRPCError({ code: "BAD_REQUEST", message: "Diskon tidak boleh melebihi harga paket." });
        const activeStudents = await db.select().from(students).where(and(eq(students.status, "active"), eq(students.classStatus, "active"), isNull(students.deletedAt))).orderBy(students.fullName).limit(500);
        let created = 0; let skipped = 0;
        const createdInvoices: Array<{ studentId: number; invoiceNumber: string; total: number }> = [];
        for (const student of activeStudents) {
          const existing = await db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.studentId, student.id), eq(invoices.packageId, selectedPackage.id), eq(invoices.dueDate, input.dueDate), isNull(invoices.deletedAt))).limit(1);
          if (existing.length > 0) { skipped += 1; continue; }
          const total = selectedPackage.price - input.discount + input.adminFee + input.tax;
          const invoiceNumber = `INV-KBS-${input.dueDate.toISOString().slice(0, 10).replaceAll("-", "")}-${student.id}-${String(Date.now()).slice(-4)}`;
          const result = await db.insert(invoices).values({ invoiceNumber, studentId: student.id, packageId: selectedPackage.id, subtotal: selectedPackage.price, discount: input.discount, adminFee: input.adminFee, tax: input.tax, total, paidAmount: 0, status: "unpaid", dueDate: input.dueDate });
          const invoiceId = Number(result[0].insertId);
          created += 1;
          createdInvoices.push({ studentId: student.id, invoiceNumber, total });
          await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "invoice", entityId: invoiceId, action: "created:active_class_bulk", metadata: JSON.stringify({ invoiceNumber, studentId: student.id, packageId: selectedPackage.id, dueDate: input.dueDate.toISOString() }) });
        }
        return { created, skipped, candidates: activeStudents.length, invoices: createdInvoices };
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
    recordManual: staffProcedure
      .input(z.object({ sessionId: staffId, studentId: staffId, status: z.enum(["present", "excused", "sick", "absent"]) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw unavailable();
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, input.sessionId), isNull(sessions.deletedAt))).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sesi kelas tidak ditemukan." });
        if (ctx.user.role === "teacher" && session.teacherUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Guru tidak ditugaskan pada sesi ini." });
        const [existing] = await db.select().from(attendance).where(and(eq(attendance.sessionId, input.sessionId), eq(attendance.studentId, input.studentId), isNull(attendance.deletedAt))).limit(1);
        if (existing) return { success: true, duplicate: true, attendanceId: existing.id };
        const result = await db.insert(attendance).values({ sessionId: input.sessionId, studentId: input.studentId, status: input.status, source: "manual", recordedBy: ctx.user.id });
        if (input.status === "present") {
          const [student] = await db.select().from(students).where(eq(students.id, input.studentId)).limit(1);
          if (student && student.remainingSessions > 0) await db.update(students).set({ remainingSessions: student.remainingSessions - 1 }).where(eq(students.id, input.studentId));
        }
        await db.insert(activityLogs).values({ actorUserId: ctx.user.id, entityType: "attendance", entityId: Number(result[0].insertId), action: "recorded:manual", metadata: JSON.stringify(input) });
        return { success: true, duplicate: false, attendanceId: Number(result[0].insertId) };
      }),
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
