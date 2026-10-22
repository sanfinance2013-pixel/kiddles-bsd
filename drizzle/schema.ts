import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "owner", "teacher", "parent"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  studentNo: varchar("studentNo", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  guardianName: varchar("guardianName", { length: 160 }).notNull(),
  guardianPhone: varchar("guardianPhone", { length: 32 }),
  program: varchar("program", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["active", "leave", "stopped"]).default("active").notNull(),
  remainingSessions: int("remainingSessions").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

export const packages = mysqlTable("packages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  program: varchar("program", { length: 80 }).notNull(),
  price: int("price").notNull(),
  sessionCount: int("sessionCount").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Package = typeof packages.$inferSelect;
export type InsertPackage = typeof packages.$inferInsert;

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 48 }).notNull().unique(),
  studentId: int("studentId").notNull(),
  packageId: int("packageId"),
  subtotal: int("subtotal").notNull(),
  discount: int("discount").default(0).notNull(),
  adminFee: int("adminFee").default(0).notNull(),
  tax: int("tax").default(0).notNull(),
  total: int("total").notNull(),
  paidAmount: int("paidAmount").default(0).notNull(),
  status: mysqlEnum("status", ["unpaid", "partial", "paid", "overdue", "cancelled"]).default("unpaid").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const paymentEvidence = mysqlTable("paymentEvidence", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  objectKey: varchar("objectKey", { length: 255 }).notNull(),
  stableUrl: varchar("stableUrl", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "review"]).default("pending").notNull(),
  note: text("note"),
  createdBy: int("createdBy"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type PaymentEvidence = typeof paymentEvidence.$inferSelect;
export type InsertPaymentEvidence = typeof paymentEvidence.$inferInsert;

export const studentQrTokens = mysqlTable("studentQrTokens", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentQrToken = typeof studentQrTokens.$inferSelect;
export type InsertStudentQrToken = typeof studentQrTokens.$inferInsert;

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  className: varchar("className", { length: 160 }).notNull(),
  program: varchar("program", { length: 80 }).notNull(),
  teacherUserId: int("teacherUserId"),
  room: varchar("room", { length: 120 }),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  status: mysqlEnum("status", ["scheduled", "active", "completed", "rescheduled", "cancelled"]).default("scheduled").notNull(),
  qrStatus: mysqlEnum("qrStatus", ["inactive", "active", "closed", "cancelled"]).default("inactive").notNull(),
  qrActivatedAt: timestamp("qrActivatedAt"),
  qrClosedAt: timestamp("qrClosedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export const sessionQrTokens = mysqlTable("sessionQrTokens", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  activeFrom: timestamp("activeFrom").notNull(),
  activeUntil: timestamp("activeUntil").notNull(),
  status: mysqlEnum("status", ["inactive", "active", "closed", "cancelled"]).default("inactive").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionQrToken = typeof sessionQrTokens.$inferSelect;
export type InsertSessionQrToken = typeof sessionQrTokens.$inferInsert;

export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  studentId: int("studentId").notNull(),
  status: mysqlEnum("status", ["present", "excused", "sick", "absent"]).notNull(),
  source: mysqlEnum("source", ["qr", "manual"]).default("qr").notNull(),
  recordedBy: int("recordedBy").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  sessionStudentUnique: uniqueIndex("attendance_session_student_unique").on(table.sessionId, table.studentId),
}));

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

export const teacherPayouts = mysqlTable("teacherPayouts", {
  id: int("id").autoincrement().primaryKey(),
  teacherUserId: int("teacherUserId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  grossAmount: int("grossAmount").default(0).notNull(),
  taxAmount: int("taxAmount").default(0).notNull(),
  deductions: int("deductions").default(0).notNull(),
  netAmount: int("netAmount").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "reviewed", "approved", "paid", "cancelled"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type TeacherPayout = typeof teacherPayouts.$inferSelect;
export type InsertTeacherPayout = typeof teacherPayouts.$inferInsert;

export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
