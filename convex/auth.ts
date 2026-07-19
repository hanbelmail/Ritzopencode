import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email || "").trim().toLowerCase();
        if (!email) throw new Error("Email is required");
        if (params.flow === "signUp") {
          const enabled = process.env.STAFF_REGISTRATION_ENABLED === "true";
          const expectedInvite = process.env.STAFF_REGISTRATION_INVITE_CODE;
          const suppliedInvite = String(params.inviteCode || "");
          if (!enabled || !expectedInvite || suppliedInvite !== expectedInvite) {
            throw new Error("Staff registration is disabled or the invitation code is invalid");
          }
        }
        return { email };
      },
      reset: Resend({
        from: requireEnv("AUTH_RESEND_FROM"),
        async sendVerificationRequest({ identifier: to, provider, url }) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: provider.from,
              to,
              subject: "Reset your Waikiki Secret password",
              html: `<p>Click the link below to reset your Waikiki Secret password.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
              text: `Reset your Waikiki Secret password: ${url}\n\nIf you did not request this, you can ignore this email.`,
            }),
          });

          if (!res.ok) {
            throw new Error("Resend error: " + JSON.stringify(await res.json()));
          }
        },
      }),
    }),
  ],
});
