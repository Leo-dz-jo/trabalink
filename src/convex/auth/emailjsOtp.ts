import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

// EmailJS REST API endpoint
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";

export const emailjsOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes as Uint8Array<ArrayBuffer>);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },

  async sendVerificationRequest({ identifier: email, token }) {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional, for private key auth

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        "EmailJS configuration missing. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY environment variables in Convex dashboard."
      );
    }

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey, // Optional, for private key auth
      template_params: {
        to_email: email,
        to_name: email.split("@")[0],
        otp_code: token,
        // Add any other template variables here
      },
    };

    try {
      console.log("[EmailJS] Sending verification email to:", email);
      console.log("[EmailJS] Payload:", JSON.stringify({ ...payload, template_params: { ...payload.template_params, otp_code: "***" } }));

      const response = await fetch(EMAILJS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("[EmailJS] Response status:", response.status);
      console.log("[EmailJS] Response body:", responseText);

      if (!response.ok) {
        throw new Error(`EmailJS API error (${response.status}): ${responseText}`);
      }

      // EmailJS returns "OK" as plain text on success, not JSON
      if (responseText.trim() === "OK") {
        console.log("[EmailJS] Verification email sent successfully");
      } else {
        try {
          const result = JSON.parse(responseText);
          console.log("[EmailJS] Verification email sent:", result);
        } catch {
          console.log("[EmailJS] Verification email sent (non-JSON response):", responseText);
        }
      }
    } catch (error) {
      console.error("[EmailJS] Failed to send verification email:", error);
      throw new Error(
        `Could not send verification email: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});