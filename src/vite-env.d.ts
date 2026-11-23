/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  /** EmailJS service id (e.g. service_xxxxxxx). Optional: app degrades gracefully. */
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  /** EmailJS template id (e.g. template_xxxxxxx). */
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  /** EmailJS public key. Safe to ship in the client — never a private key. */
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  emailjs?: unknown;
}
