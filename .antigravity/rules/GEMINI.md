# GEMINI.md — Paceup Project Context for Antigravity

> This file is the AI agent's source of truth for the Paceup project.
> Read this entire file before writing any code in this project.
> If anything in a prompt conflicts with this file, this file wins.

---

## Project Identity

**Name:** Paceup
**Tagline:** Built for teams that actually want to finish.
**Type:** Full-stack web application (SaaS)
**Domain:** Student project management and AI-assisted team leadership
**Developer:** Jeswin (GitHub: 1712Jeswin)

---

## What Paceup Does

Paceup is an AI project leader for student teams. It solves the leadership vacuum that kills most group projects.

When a group starts a project, they submit a brief (idea, solution, deadline, scope) and each member fills in a skill profile (languages, domains, comfort level). The AI reads all of this and assigns each member a specific role and a set of tasks — not randomly, but based on who they are.

Once the project is running:
- The AI monitors GitHub commits and compares them to assigned tasks
- It sends daily stand-up prompts to each member
- It detects when two members are touching the same file (conflict)
- It nags members who fall behind via in-app notifications and email
- It reviews submitted work and traces errors back to the member who wrote that module
- It generates handoff summaries when a module is completed

The AI is powered by the user's own API key — Paceup does not charge for AI usage (BYOK model).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 — App Router, TypeScript, Server Components |
| Database | Neon (PostgreSQL) via Prisma ORM |
| Auth | Clerk |
| Email | Resend with React Email templates |
| Queue / scheduling | Upstash Redis (nag loop via Vercel Cron) |
| AI routing | Vercel AI SDK (unified interface across all providers) |
| File storage | Vercel Blob |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui (overridden with Doom Neon tokens) |
| GitHub integration | GitHub REST API + Webhooks |
| Charts | Recharts (analytics), plain SVG (Gantt) |
| PDF export | @react-pdf/renderer |
| Payments | Stripe (Phase 4) |

---

## Project Structure

```
/app
  /(auth)              — sign-in, sign-up pages (Clerk-managed)
  /dashboard
    /group
      /[id]            — group home dashboard
      /[id]/brief      — project brief form
      /[id]/tasks      — task board
      /[id]/commits    — commit feed
      /[id]/standup    — daily stand-up
      /[id]/submit     — submission portal
      /[id]/reviews    — AI review reports
      /[id]/timeline   — Gantt chart
      /[id]/analytics  — contribution heatmap and charts
      /[id]/settings   — group settings (GitHub link, mentor invite, persona)
      /[id]/leaderboard — hackathon leaderboard (Phase 4)
    /new-group         — create group page
    /profile/setup     — skill profile setup
    /profile/skills    — cross-project skill graph (Phase 4)
    /settings/keys     — BYOK API key vault
    /billing           — Stripe billing (Phase 4)
  /join/[code]         — public group join page
  /mentor/[token]      — mentor invite accept page
  /mentor/[groupId]    — mentor read-only dashboard
  /projects            — public showcase (Phase 4)
  /projects/[groupId]  — public project page (Phase 4)
  /institution/[id]    — institution admin (Phase 4)

/app/api
  /webhooks/clerk      — Clerk user sync
  /webhooks/github     — GitHub commit/PR ingestion
  /webhooks/stripe     — Stripe subscription events (Phase 4)
  /cron/nag            — daily nag loop (Vercel Cron)
  /groups              — group CRUD
  /tasks/[id]          — task status update
  /standup             — stand-up responses
  /notifications/mark-read/[id]
  /ai/assign-tasks     — AI role and task assignment
  /ai/review-code      — code review agent
  /ai/handoff-summary  — handoff summary generation

/components            — reusable UI components
/emails                — React Email templates
/lib
  /db.ts               — Prisma client singleton
  /ai.ts               — Vercel AI SDK routing + provider selection
  /crypto.ts           — AES-256 key encryption/decryption
  /github.ts           — GitHub REST API helpers
  /health-score.ts     — health score calculation (Phase 3)
  /plan-check.ts       — server-side plan enforcement (Phase 4)
/prisma
  /schema.prisma
  /migrations/
/types                 — shared TypeScript interfaces
/changelogs            — post-phase changelog MDs
```

---

## Database Models (Summary)

- **User** — Clerk sync, name, email, skills (JSON), domains (JSON), level, plan
- **Group** — name, inviteCode, createdBy, githubRepoUrl, aiPersona, isHackathonMode
- **GroupMember** — groupId, userId, role (AI-assigned)
- **ProjectBrief** — groupId, ideaStatement, solutionApproach, deadline, scopeStatement, isHardwareMode, isPublic
- **Task** — projectBriefId, assignedUserId, title, description, estimatedDays, status
- **AIKey** — userId, provider, encryptedKey, modelName, isActive
- **Commit** — groupId, authorGithubUsername, sha, message, filesChanged
- **CommitTaskLink** — commitId, taskId, confidence
- **PullRequest** — groupId, number, title, authorGithubUsername, status
- **ConflictAlert** — groupId, filename, memberIds, detectedAt, resolvedAt
- **StandupResponse** — userId, groupId, date, didYesterday, planToday, blockers
- **Notification** — userId, groupId, type, message, readAt
- **CodeReview** — taskId, reviewedBy, result, feedback, issues
- **Submission** — taskId, userId, groupId, fileUrl, notes, reviewStatus
- **HandoffSummary** — taskId, summary
- **MentorAccess** — groupId, mentorEmail, inviteToken, acceptedAt
- **Institution** — name, domain, adminUserId (Phase 4)
- **InstitutionGroup** — institutionId, groupId (Phase 4)

---

## Visual Design — Doom × Neon Aesthetic

Paceup uses a dark, dramatic UI aesthetic. Apply these tokens everywhere:

### Colour Tokens

```css
--bg-primary: #0a0a0f;       /* near-black background */
--bg-secondary: #111118;     /* card/panel background */
--bg-tertiary: #1a1a24;      /* input/hover background */

--accent-green: #39ff14;     /* toxic doom green — primary CTA, active states */
--accent-magenta: #ff00ff;   /* electric magenta — warnings, alerts, highlights */
--accent-blue: #00cfff;      /* cold blue — info, links, commit activity */
--accent-gold: #ffd700;      /* molten gold — success, health score, badges */

--text-primary: #e8e8f0;     /* near-white body text */
--text-secondary: #8888a8;   /* muted secondary text */
--text-muted: #444460;       /* disabled / placeholder text */

--border: #2a2a3a;           /* default border */
--border-active: #39ff14;    /* active input / focused border */
```

### Typography
- Display / headings: `font-family: 'JetBrains Mono', monospace` — techy, commanding
- Body: `font-family: 'Inter', sans-serif` — readable
- Code blocks: `font-family: 'JetBrains Mono', monospace`

### Component Behaviour
- Buttons: default border is `--border`. On hover: border becomes `--accent-green`, text becomes `--accent-green`. Active: scale(0.97).
- Inputs: background `--bg-tertiary`, border `--border`. On focus: border `--accent-green`, faint green glow (`box-shadow: 0 0 0 2px rgba(57,255,20,0.15)`).
- Cards: `--bg-secondary`, border `--border`, `border-radius: 8px`.
- Status badges: NOT_STARTED = grey, IN_PROGRESS = `--accent-blue`, DONE = `--accent-gold`, OVERDUE = `--accent-magenta`.
- Health score gauge: gradient from `--accent-magenta` (0) through `--accent-blue` (50) to `--accent-gold` (100).
- Notification bell badge: `--accent-magenta` background.

### shadcn/ui Overrides
Override shadcn defaults with the Doom Neon tokens above. Do not use default shadcn light-mode white backgrounds. Everything is dark.

---

## AI Integration Rules

### BYOK Architecture
- API keys are entered by the user in `/dashboard/settings/keys`
- Keys are encrypted with AES-256 before storage (`lib/crypto.ts`)
- Decryption happens server-side only, at the moment of the AI call
- Never return a decrypted key to the client in any response
- Never log a key in any server log

### Provider Routing
Use Vercel AI SDK's unified interface. The active provider and model are fetched from the AIKey table for the session user before every AI call. Supported:
- Anthropic (`@ai-sdk/anthropic`) — claude-sonnet-4-6, claude-haiku-4-5
- OpenAI (`@ai-sdk/openai`) — gpt-4o, gpt-4o-mini
- Google (`@ai-sdk/google`) — gemini-1.5-pro, gemini-1.5-flash
- xAI (`@ai-sdk/xai`) — grok-2

### AI Prompt Standards
All AI calls must:
- Include the AI persona context (STRICT / COACH / FLEXIBLE) from the group settings
- Instruct the model to return only structured JSON for data-returning calls — no prose, no markdown fences
- Include a fallback: if the model returns malformed JSON, retry once, then return an error to the client
- Never include the user's API key in the prompt itself

---

## Security Requirements

- All `/dashboard/*` and `/api/*` routes (except public join and mentor accept) require a valid Clerk session
- Clerk session is verified with `auth()` from `@clerk/nextjs/server` — never trust client-passed user IDs
- GitHub webhook: verify `X-Hub-Signature-256` header before processing
- Stripe webhook: verify `stripe-signature` header before processing (Phase 4)
- Mentor routes: verify MentorAccess record exists for the requesting user before serving data
- Institution admin routes: verify Institution.adminUserId matches the session user
- Plan checks: always check `user.plan` server-side before serving Pro features — never rely on client-side flags
- API keys: AES-256 encryption at rest, decryption server-side only

---

## Code Quality Standards

These rules apply to every file in this project, no exceptions:

- TypeScript strict mode. No `any` types. If unavoidable, add a comment explaining why.
- All API routes return: `{ success: boolean, data?: any, error?: string }`
- All forms must have: loading state (disable submit, show spinner), error state (display message under field), success state (clear form or redirect)
- All pages must have: loading skeleton (use shadcn Skeleton), error boundary with a "Try again" button
- No direct `fetch` calls from client components to external APIs — all external calls go through Next.js API routes
- Environment variables: all required vars are documented in `.env.local.example`. The app must fail fast with a clear error if a required var is missing at startup.
- Prisma: always use the singleton pattern from `lib/db.ts`. Never instantiate `PrismaClient` outside this file.
- Cron routes: always protect with a `CRON_SECRET` header check before executing — reject with 401 otherwise

---

## Current Build Phase

> Update this section manually as each phase completes.

- [x] Phase 1 — MVP Core
- [ ] Phase 2 — Intelligence Layer
- [ ] Phase 3 — Collaboration Layer
- [ ] Phase 4 — Scale and Polish

**Active phase:** Phase 1

---

## Environment Variables Required

```
# Neon / Prisma
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# AI key encryption
AI_KEY_SECRET=          # 32-character random string

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GitHub integration
GITHUB_WEBHOOK_SECRET=

# Vercel Cron protection
CRON_SECRET=

# Stripe (Phase 4)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## What the Agent Must Never Do

- Never rewrite a completed phase's working code without being explicitly asked
- Never expose a decrypted API key in any response, log, or client-side variable
- Never skip TypeScript types with `any` silently — always flag and comment
- Never implement a feature from a future phase without being asked
- Never commit secrets or keys to the codebase or `.env` files
- Never use `console.log` for secrets — use `console.error` with a sanitised message only
- Never make the AI pick a provider randomly — always use the user's active AIKey

---

*This file is maintained by Jeswin. Last updated: Phase 1.*