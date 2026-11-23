import emailjs from "@emailjs/browser";

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

export function isEmailConfigured(): boolean {
  return Boolean(serviceId && templateId && publicKey);
}

export interface ApplicationEmailArgs {
  applicantName: string;
  applicantEmail?: string;
  employerEmail?: string;
  companyName: string;
  jobTitle: string;
  score: number;
  bucketLabel: string;
  conditions: number;
}

async function send(params: Record<string, string>) {
  if (!isEmailConfigured()) return false;
  try {
    await emailjs.send(serviceId!, templateId!, params, { publicKey: publicKey! });
    return true;
  } catch (error) {
    console.warn("[Trabalink] EmailJS delivery failed", error);
    return false;
  }
}

/**
 * Sends two transactional emails through EmailJS: a receipt to the applicant
 * and a review alert to the hiring team. Delivery is best-effort — the
 * application is already saved, so a mail failure must never block the flow.
 */
export async function sendApplicationEmails(
  args: ApplicationEmailArgs,
): Promise<{ applicantSent: boolean; employerSent: boolean }> {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const subject = `New application: ${args.jobTitle} — ${args.applicantName}`;
  const message = [
    `${args.applicantName} applied for ${args.jobTitle} at ${args.companyName}.`,
    `Qualification score: ${args.score}/100 (${args.bucketLabel}).`,
    args.conditions > 0
      ? `${args.conditions} condition${args.conditions === 1 ? "" : "s"} need follow-up.`
      : "No outstanding conditions.",
    `Review the applicant: ${appUrl}/app/employer/pipeline`,
  ].join("\n");

  const employerSent = args.employerEmail
    ? await send({
        to_email: args.employerEmail,
        to_name: args.companyName,
        subject,
        message,
        reply_to: args.applicantEmail ?? "",
        from_name: "Trabalink",
        app_name: "Trabalink",
      })
    : false;

  const applicantSent = args.applicantEmail
    ? await send({
        to_email: args.applicantEmail,
        to_name: args.applicantName,
        subject: `Application received — ${args.jobTitle}`,
        message: [
          `Hi ${args.applicantName},`,
          `Your application for ${args.jobTitle} at ${args.companyName} was received.`,
          `Current qualification score: ${args.score}/100 (${args.bucketLabel}).`,
          "The hiring team reviews every application personally — no automatic rejections.",
          `Track your status: ${appUrl}/app/applications`,
        ].join("\n"),
        reply_to: args.employerEmail ?? "",
        from_name: "Trabalink",
        app_name: "Trabalink",
      })
    : false;

  return { applicantSent, employerSent };
}

export async function sendWelcomeEmail(args: {
  toName: string;
  toEmail?: string;
  role: "applicant" | "employer";
}): Promise<boolean> {
  if (!args.toEmail) return false;
  return send({
    to_email: args.toEmail,
    to_name: args.toName,
    subject: "Welcome to Trabalink",
    message:
      args.role === "applicant"
        ? `Hi ${args.toName}, your Trabalink profile is ready. Add your resume, credentials, and skills so employers can see exactly why you qualify.`
        : `Hi ${args.toName}, your Trabalink company workspace is ready. Post your first role with weighted requirements and Trabalink will rank every applicant with a transparent breakdown.`,
    from_name: "Trabalink",
    app_name: "Trabalink",
  });
}
