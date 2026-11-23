# TRABALINK

**Automated applicant screening. Hire on proof, not luck.**

Trabalink is a Philippine-first hiring workspace. Applicants build one evidence-rich
profile and see exactly why they match a role; employers post weighted requirements and
review a ranked, explainable pipeline. A human always makes the decision — nothing is
auto-rejected.

TRABALINK is also an academic thesis project exploring whether automated first-pass
screening can be made fair, explainable, and useful to fresh graduates entering the
Philippine job market. The product is intentionally serious: every automated score is
shown with its reasons, and a person always makes the final decision.

This repository contains **version 1**:

- Password sign-in with email-verified sign-up, password reset, and in-app password changes
- Applicant / employer roles and RA 10173 consent captured during onboarding
- Applicant profile with resume upload, education, experience, OJT, skills, credentials,
  links, and a live profile-strength score
- Company profile with logo, industry, size, and hiring contact
- Employer job posting with weighted requirements (mandatory / obtainable later /
  preferred), OR groups, grace periods, and knockout screening questions
- Role catalog with live match scores, job detail with "why you match / what you're
  missing", application flow, and application tracker
- Employer dashboard, job management, cross-role applicant pipeline with bucket filters,
  applicant detail with score breakdown, resume access, notes, and status decisions
- Private applicant–employer messaging tied to a role, with unread tracking
- Administrator console for account suspension, job moderation, and marketplace review
- **Workspace copilot** (Alt + J) that answers role-aware questions from live data:
  best-fit roles and reasons, profile gaps, pipeline briefings, dated follow-ups, and
  unread conversations — with deep links into the workspace
- Editorial Ledger design system: navy, pale sky, white, and gold; serif display
  typography, ruled sections, floating pill navigation, custom cursor, interactive
  particle backdrop, and a full light/dark theme
- EmailJS transactional email for application receipts and employer alerts

---

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Routing | React Router 7 (`react-router`) |
| Forms | React Hook Form + Zod |
| Backend & database | **Convex** (queries, mutations, file storage) |
| Auth | Convex Auth password provider + verified email for sign-up and resets |
| Email | EmailJS (`@emailjs/browser`) |
| Theme | Editorial navy/gold light and dark palettes, system preference respected |
| Installability | Web app manifest (install to home screen / desktop where supported) |

### Assumptions made for this build

1. **Convex instead of Supabase.** This project runs in a managed Vite + Convex
   environment, so the original Supabase plan is implemented natively in Convex:
   role-scoped queries, server-side authorization instead of Postgres RLS, and Convex
   file storage instead of Supabase Storage. The security outcomes (per-user access,
   private resumes, employer-only review) are preserved.
2. **Password sign-in; email verification only where it matters.** Real accounts choose
   a password at sign-up. A six-digit email code confirms a new address and verifies
   ownership before a reset or password change. Normal sign-in is email + password with
   no code. The two published demo accounts remain one-click password logins.
   Accounts created during the earlier email-code version can add a password by using
   **Create account** with the same verified email.
3. **Version 1 scope.** Portfolio previews (ZIP sites, GitHub API, pdf.js) and
   Tauri/Capacitor native wrappers are intentionally outside this version. Native
   wrapper builds require toolchains that are not available in this web runtime; the
   product ships as a responsive web/PWA experience.
4. TanStack Query is not used because Convex provides reactive subscriptions for every
   query. Adding a second cache would duplicate server state.

---

## Environment variables

Client-side (configured in the project's Keys panel / `.env`; do **not** commit secrets):

```bash
VITE_CONVEX_URL=...              # injected by Freebuff, or your own Convex deployment

VITE_EMAILJS_SERVICE_ID=...      # EmailJS → Email Services
VITE_EMAILJS_TEMPLATE_ID=...     # EmailJS → Email Templates
VITE_EMAILJS_PUBLIC_KEY=...      # EmailJS → Account → General (public key only)
```

`VITE_EMAILJS_PUBLIC_KEY` is designed to be public. **Never** place a private API key or
service key in frontend code.

Without the three EmailJS variables the app still works: emails are skipped and the
success toast is shown. Email delivery is best-effort and never blocks an application.

### EmailJS template contract

Create one template with these variables:

| Variable | Value |
| --- | --- |
| `{{to_email}}` | Recipient address |
| `{{to_name}}` | Recipient name |
| `{{from_name}}` | `Trabalink` |
| `{{reply_to}}` | Counterparty email |
| `{{subject}}` | Email subject |
| `{{message}}` | Plain-text body, newline separated |
| `{{app_name}}` | `Trabalink` |

Set the template's **To** field to `{{to_email}}` and **Reply-To** to `{{reply_to}}`.
The app sends two messages per application: a receipt to the applicant and a review
alert to the company's hiring contact email.

---

## Local development

Requirements: Bun, a Convex deployment (free tier is fine).

```bash
bun install
bunx convex dev          # links the deployment, pushes functions, watches changes
bun run dev              # Vite dev server (default http://localhost:5173)
```

Checks:

```bash
bun run typecheck        # tsc -b --noEmit
bun test                 # qualification engine unit tests (8 tests)
bunx convex dev --once   # push Convex functions without watch mode
```

Production build:

```bash
bun run build            # typecheck + Vite build to dist/
```

On Freebuff, the dev server and `convex dev` are managed automatically — do not start
them manually.

---

## Demo workspaces

The sign-in page has one-click **Applicant demo** and **Employer demo** buttons; the
landing page links straight to either workspace. No email code is required.

The two accounts are fixed and intentionally public. The first demo entry creates them
server-side and seeds a shared Northstar Digital workspace:

- three open roles (web development, data analysis, product support)
- seven applications across the pipeline, with qualified, conditional, and missing
  requirement examples
- a shortlisted application and two private conversations, including one unread thread
  on each side
- a complete applicant profile for Mika Santos

Data is shared between visitors, so changes such as status updates or replies are
visible to others until the next seed repairs the core roles. The demo accounts cannot
claim founding administrator access or be suspended. Use a real email account to test
administrator moderation.

Open the copilot with the sparkle button in the floating navigation or **Alt + J**.
Try "Which open role fits me best?" as the applicant demo, or "Summarize my pipeline"
as the employer demo.

The seeded content is created by `convex/demo.ts`; the public credentials live in
`src/lib/demo.ts` and are deliberately not secrets.

---

## Manual QA script

0. Fast path: `/auth` → **Applicant demo** → inspect the dashboard, catalog, a role
detail, tracker, and the unread conversation. Sign out, then open the **Employer demo**
for the pipeline, job posts, and inbox.

1. Open `/`, move the pointer across the interactive backdrop, then toggle light/dark
   and confirm the particles, orbs, and gold cursor remain visible in both themes.
   Check the floating pill navigation, then open the copilot with Alt + J.
2. **Create an employer:** `/auth` → **Create account** → email + password → six-digit
   email code → onboarding → choose "I'm hiring" → accept RA 10173 → save company
   profile. Sign out and confirm the same email + password signs in without a code.
3. Post a job with a mandatory skill, an "obtainable later" license, a preferred
   requirement, and one knockout question.
4. Sign out. **Create an applicant:** `/auth` → **Create account** with a second email,
   password, and email code → "I'm applying" → add name, skills, education, credential
   marked "Exam scheduled", resume → save.
5. Browse `/app/jobs` (the role catalog): verify the live score and missing/partial
   reasons. Apply, answer the knockout question, confirm the receipt state, then open
   **Messages** and start a thread with the hiring team.
6. Sign back in as the employer → `/app` review queue → open the applicant. Check the
   breakdown, resume link, conditions with deadlines, add a note, message the applicant,
   and shortlist them.
7. Re-open the applicant's `/app/applications` and confirm the status changed. Open
   **Messages** and reply as the applicant.
8. Open the account menu → **Password & security**, request an email code, and set a
   new password. Sign out and confirm only the new password works. The same flow is
   available from **Forgot password?** on the sign-in screen.
9. Create a third verified account (complete onboarding), then open `/app/admin` and
   claim founding administrator access. This changes that account's role to
   administrator. Suspend the applicant, confirm their actions are blocked by the
   banner, then restore access. Close and reopen a job post.
10. Resize to 360 px, 768 px, and 1440 px: the top tabs wrap below the floating pill on
   mobile, the desktop pill keeps its grouped nav, and nothing overflows horizontally.

---

## Qualification engine

Implemented as a pure TypeScript function in `src/lib/scoring.ts` with no UI or database
imports. It is used by the client for live match previews and by Convex queries for the
employer pipeline, so applicant and employer always see the same numbers.

Rules:

- Any unmet **MANDATORY** requirement → `NOT_QUALIFIED`.
- Missing or partial **OBTAINABLE_LATER** requirement → `CONDITIONALLY_QUALIFIED`, with
  the condition and a deadline (grace period or scheduled exam date).
- **EXAM_SCHEDULED / IN_PROGRESS** credentials earn 50% credit and a condition.
- **PREFERRED** requirements add points and never disqualify.
- Requirements sharing a **group ID** are OR alternatives; the best alternative counts
  and the heaviest weight is used once.
- **Fresh-grad mode** applies when the job is entry level or the applicant flagged
  themselves as a fresh grad/student: experience weight becomes 15%, education and
  credentials become 130%.
- A failed **knockout question** forces `NOT_QUALIFIED`; any mandatory gap caps the
  score at 49 so a disqualified applicant never outranks a qualified one.
- Applicants with no requirements score 100 and remain qualified; the employer decides.

Scores are recommendations. Employers shortlist, reject, or hire manually, with notes.

Tests (`src/lib/scoring.test.ts`) cover: license obtainable later, exam scheduled,
fresh grad with no experience, a mandatory experience requirement that cannot
disqualify a fresh grad, OR-group alternatives, knockout failure, all preferred
missing, and a plain unmet mandatory requirement.

```bash
bun test src/lib/scoring.test.ts
```

---

## Project structure

```
src/
  main.tsx                    routes, providers, theme
  index.css                   editorial navy/gold light and dark tokens
  components/
    brand/brand.tsx           animated trabalink wordmark + mark
    assistant/copilot.tsx     workspace copilot sheet, suggestions, deep links
    auth/change-password-dialog.tsx  emailed-code password change while signed in
    custom-cursor.tsx         desktop dot + gold trailing ring
    landing-backdrop.tsx      interactive canvas particles, orbs, pointer glow
    layout/app-shell.tsx      floating pill top navigation + mobile tabs
    jobs/job-card.tsx         job feed card with live match
    jobs/apply-dialog.tsx     knockout questions, cover note, EmailJS dispatch
    applicants/applicant-row.tsx
    shared/                   page, badges, score ring, tag input, avatar
    ui/                       shadcn/ui primitives
  convex/
    schema.ts                 users, profiles, jobs, applications, conversations, messages
    profiles.ts               viewer, role, profile upserts, uploads
    jobs.ts                   job CRUD, catalog feed, company joins
    applications.ts           apply, applicant tracker, employer pipeline, scoring
    conversations.ts          private messaging, unread counts, read receipts
    demo.ts                   one-click demo accounts + seeded workspace
    admin.ts                  founding admin, account suspension, job moderation
    assistant.ts              role-aware, workspace-grounded copilot answers
    lib/access.ts             auth guards, suspension guard, input sanitising
  lib/
    scoring.ts                pure qualification engine
    scoring.test.ts           engine tests
    email.ts                  EmailJS delivery (graceful degradation)
    profile.ts                completeness scoring
    password.ts               shared password policy
    constants.ts, format.ts
  pages/
    Landing.tsx, Auth.tsx, Onboarding.tsx, NotFound.tsx
    app/                      dashboards, catalog, applications, profiles, messaging,
                              employer tools, admin console
public/
  logo.svg, manifest.webmanifest
```

### Data model

`users` (auth, role, consent, suspension) · `applicantProfiles` · `employerProfiles` ·
`jobs` (with embedded `requirements`) · `applications` (status, notes, knockout answers) ·
`conversations` · `messages`. Resume, photo, and logo files live in Convex storage; only
authorized queries return their signed URLs.

---

## Security notes

- Every Convex query and mutation resolves the caller with `getAuthUserId` and scopes
  results to that user. Employer review queries verify job ownership; applicant detail
  verifies either ownership of the job or of the application.
- Resume and photo URLs are only minted inside authorized queries.
- Uploads are validated on the client **and** server (PDF/DOCX ≤ 5 MB; images ≤ 3 MB,
  image MIME types only).
- All URLs are normalized and restricted to `https://`.
- Stored text is trimmed and length-capped; React escapes rendered content, and no
  `dangerouslySetInnerHTML` is used.
- Passwords are hashed by Convex Auth's scrypt-based password provider; plaintext
  passwords are never stored. Server-side rules require at least eight characters with
  a letter and a number.
- Email verification codes are short-lived (15 minutes), single-use, and only created
  for sign-up or password reset/change. They are not a standalone sign-in method.
- The RA 10173 consent timestamp and version are stored on the user record.
- Administrators can moderate accounts and posts but cannot read private conversations
  or resume files. Suspended accounts can read their records but cannot apply, post jobs,
  message, or edit profiles.

---

## Known limitations / next steps

- Email delivery needs the three EmailJS variables. Without them, notifications are
  skipped by design.
- No service worker / offline cache; installability depends on browser manifest support.
- No native Tauri or Capacitor builds in this environment.
- The first verified account can claim the founding administrator console once. After
  that, administrator accounts can only be created by changing the role in the backend.
- The copilot is deterministic retrieval over the caller's authorized Convex data, not
  an external large language model. This keeps answers explainable, cheap, and private;
  an LLM layer can be added later behind the same `assistant:ask` query.
- Consent withdrawal and account-data deletion are handled administratively; there is no
  self-serve delete button yet. The privacy copy reflects that route accurately.
- Version 2 candidates: portfolio system with sandboxed previews, threaded comments on
  roles, saved jobs, in-app notifications, and structured resume parsing.
