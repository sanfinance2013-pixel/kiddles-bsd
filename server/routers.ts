import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { domainRouter } from "./domainRouter";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { sdk } from "./_core/sdk";

const scrypt = promisify(scryptCallback);
const ADMIN_EMAIL = "sanfinance2013@gmail.com";
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailOpenId = (email: string) => `email:${normalizeEmail(email)}`;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const passwordInput = z.string().min(12, "Password minimal 12 karakter.").max(200);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginEmail: publicProcedure
      .input(z.object({ email: z.string().email(), password: passwordInput }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database belum tersedia.");
        const email = normalizeEmail(input.email);
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new Error("Email atau password tidak benar.");
        }
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        const token = await sdk.signSession({ openId: user.openId, appId: process.env.MANUS_PROJECT_ID ?? "", name: user.name ?? email });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
        return { success: true } as const;
      }),
    setupEmailAdmin: protectedProcedure
      .input(z.object({ password: passwordInput }))
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(ctx.user.email ?? "");
        if (email !== ADMIN_EMAIL && !["admin", "owner"].includes(ctx.user.role)) {
          throw new Error("Hanya akun admin utama yang dapat mengaktifkan login email.");
        }
        const db = await getDb();
        if (!db) throw new Error("Database belum tersedia.");
        const passwordHash = await hashPassword(input.password);
        const [existing] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
        if (existing) {
          await db.update(users).set({ name: "Admin KIDDLES BSD", role: "admin", loginMethod: "email", passwordHash }).where(eq(users.id, existing.id));
        } else {
          await db.insert(users).values({ openId: emailOpenId(ADMIN_EMAIL), name: "Admin KIDDLES BSD", email: ADMIN_EMAIL, role: "admin", loginMethod: "email", passwordHash });
        }
        return { success: true, email: ADMIN_EMAIL } as const;
      }),
    createEmailUser: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().trim().min(2).max(160), password: passwordInput, role: z.enum(["admin", "teacher", "parent", "user"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database belum tersedia.");
        const email = normalizeEmail(input.email);
        if (email === ADMIN_EMAIL && input.role !== "admin") throw new Error("Email admin utama harus tetap memiliki role admin.");
        const passwordHash = await hashPassword(input.password);
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          await db.update(users).set({ name: input.name, role: input.role, loginMethod: "email", passwordHash }).where(eq(users.id, existing.id));
        } else {
          await db.insert(users).values({ openId: emailOpenId(email), name: input.name, email, role: input.role, loginMethod: "email", passwordHash });
        }
        return { success: true, email, role: input.role } as const;
      }),
    listEmailUsers: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, loginMethod: users.loginMethod }).from(users).where(eq(users.loginMethod, "email"));
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  domain: domainRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
