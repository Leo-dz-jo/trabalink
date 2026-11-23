/** Shared password rules for sign-up, reset, and in-app password changes. */
export function passwordProblem(value: string): string | null {
  if (!value) return "Enter your password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Include at least one letter and one number.";
  }
  return null;
}
