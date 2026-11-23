/**
 * Public, fixed credentials for the built-in demo workspaces.
 *
 * These are intentionally shared and intentionally visible: they only ever
 * unlock the two seeded demo accounts, never a real user's account. Password
 * sign-in is restricted to these addresses in `convex/auth.ts`.
 */
export const DEMO_ACCOUNTS = {
  applicant: {
    email: "demo.applicant@trabalink.test",
    password: "trabalink-demo-2026",
    name: "Mika Santos",
  },
  employer: {
    email: "demo.employer@trabalink.test",
    password: "trabalink-demo-2026",
    name: "Northstar Digital",
  },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export const DEMO_EMAILS: readonly string[] = Object.values(DEMO_ACCOUNTS).map(
  (account) => account.email,
);

export function isDemoEmail(email: string | undefined): boolean {
  return Boolean(email && DEMO_EMAILS.includes(email));
}
