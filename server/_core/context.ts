import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/** Mode tanpa login: set ALLOW_NO_LOGIN=0 di env untuk mematikan. Default: aktif. */
function noLoginEnabled() {
  const flag = (process.env.ALLOW_NO_LOGIN ?? "1").trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "off";
}

function guestUser(): User {
  const now = new Date();
  return {
    id: 0,
    openId: "guest:no-login",
    name: "Admin KIDDLES (No Login)",
    email: "sanfinance2013@gmail.com",
    passwordHash: null,
    loginMethod: "no-login",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  if (!user && noLoginEnabled()) {
    user = guestUser();
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
