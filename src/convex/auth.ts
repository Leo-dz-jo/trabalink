import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailjsOtp } from "./auth/emailjsOtp";

/**
 * Password is the only way into a real account.
 *
 * Email codes are deliberately not a standalone sign-in provider anymore.
 * The same email provider is wired into Password as both `verify` and `reset`,
 * so it is only used to:
 *   1. confirm a new email address after password sign-up, and
 *   2. confirm ownership before a password reset or password change.
 */
const password = Password({
  profile: (params) => {
    const email =
      typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    return { email };
  },
  validatePasswordRequirements: (value) => {
    if (typeof value !== "string" || value.length < 8) {
      throw new Error("Use at least 8 characters for your password.");
    }
    if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
      throw new Error(
        "Your password needs at least one letter and one number.",
      );
    }
  },
  verify: emailjsOtp,
  reset: emailjsOtp,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password, Anonymous],
});
