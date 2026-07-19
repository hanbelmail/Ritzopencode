import { getAuthUserId } from "@convex-dev/auth/server";

export async function isStaff(ctx: any) {
  return Boolean(await getAuthUserId(ctx));
}

export async function requireStaff(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");
  return userId;
}

export function isServiceKey(value?: string) {
  const expected = process.env.SARA_SERVICE_KEY;
  return Boolean(expected && value && value === expected);
}

export function isAutomationKey(value?: string) {
  const expected = process.env.N8N_API_KEY;
  return Boolean(expected && value && value === expected);
}

export function requireServiceKey(value?: string) {
  if (!isServiceKey(value)) throw new Error("Invalid service credential");
}

export async function requireStaffOrService(ctx: any, serviceKey?: string) {
  if (isServiceKey(serviceKey)) return { actorType: "service" as const, userId: null };
  const userId = await requireStaff(ctx);
  return { actorType: "staff" as const, userId };
}

export async function requireStaffOrAutomation(ctx: any, automationKey?: string) {
  if (isAutomationKey(automationKey)) return { actorType: "automation" as const, userId: null };
  const userId = await requireStaff(ctx);
  return { actorType: "staff" as const, userId };
}
