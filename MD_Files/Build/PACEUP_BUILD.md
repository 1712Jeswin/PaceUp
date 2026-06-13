# Paceup — Build Guide & Prompts for Antigravity

> This file contains everything you need to build Paceup phase by phase inside Antigravity IDE.
> Read the **HOW TO USE THIS FILE** section first before touching any prompt.

---

## HOW TO USE THIS FILE

### What Antigravity expects
Antigravity reads your `GEMINI.md` as project context on every session. Before pasting any prompt below, make sure `GEMINI.md` is in the root of your project and up to date. The prompts below assume the agent already knows the project from that file.

### How to use a prompt
1. Open Antigravity
2. Start a new session or continue the current phase session
3. Copy the full prompt block (everything between the triple backtick fences marked `PROMPT`)
4. Paste it as your first message in the session
5. Do NOT break a phase prompt into parts — paste it whole so the agent has full context
6. Follow the pitstop instructions before moving to the next phase

### Pitstops
A pitstop is a checkpoint between phases where YOU do manual verification before the agent continues. Skipping pitstops is how bugs compound silently across phases. Each pitstop lists exactly what to check and how.

### GitHub management (for you — 1712Jeswin)
Branch strategy:
- `main` — production-ready code only. Never commit directly.
- `dev` — integration branch. Merge feature branches here first.
- `phase-1`, `phase-2`, etc. — one branch per phase. Created at phase start, merged to `dev` at phase end.
- `feat/[feature-name]` — individual feature branches cut from the phase branch.

Commit message format:
```
[phase-1] feat: add invite code group creation
[phase-1] fix: clerk webhook not updating user profile
[phase-1] chore: add prisma migration for groups table
```

At the end of each phase:
1. Merge the phase branch into `dev` via pull request
2. Review the diff yourself before merging
3. Tag the merge commit: `git tag phase-1-complete`
4. Only merge `dev` into `main` when the phase is fully tested

---

## PHASE 1 — MVP Core

**Goal:** A working group creation flow, project brief submission, AI task assignment using the user's own API key, and a basic task board.

**Branch to create before starting:**
```bash
git checkout dev
git checkout -b phase-1
```

---

### PROMPT — Phase 1

```
You are building Paceup — an AI project leader for student teams.
Project rules and context are in GEMINI.md. Read it before writing any code.

Tech stack:
- Next.js 14 App Router
- Neon PostgreSQL (via Prisma ORM)
- Clerk for authentication
- Vercel AI SDK for AI provider routing
- Upstash Redis (for future use — set up the client but do not implement queues yet)
- Resend for email (set up the client but do not send any emails yet)
- Tailwind CSS for styling
- shadcn/ui for components

What to build in this phase:

1. PROJECT SETUP
   - Initialise a Next.js 14 app with App Router, TypeScript, and Tailwind
   - Install and configure: Prisma, @clerk/nextjs, @ai-sdk/*, shadcn/ui, Resend, Upstash Redis
   - Set up Neon database connection in Prisma
   - Create a .env.local.example file listing all required environment variables with descriptions but no values
   - Set up the base folder structure:
     /app — Next.js pages and API routes
     /components — reusable UI components
     /lib — utility functions, db client, AI client
     /prisma — schema and migrations
     /types — shared TypeScript types

2. DATABASE SCHEMA (Prisma)
   Design and migrate the following models:
   - User: id, clerkId, name, email, skills (JSON array), domains (JSON array), level (BEGINNER | MID | ADVANCED), createdAt
   - Group: id, name, inviteCode (unique, 8 chars), createdBy (userId), projectBriefId, createdAt
   - GroupMember: id, groupId, userId, role (assigned by AI, nullable until brief submitted), joinedAt
   - ProjectBrief: id, groupId, ideaStatement, solutionApproach, deadline, scopeStatement, status (DRAFT | ANALYSED), createdAt
   - Task: id, projectBriefId, assignedUserId, title, description, estimatedDays, status (NOT_STARTED | IN_PROGRESS | DONE | OVERDUE), createdAt, updatedAt
   - AIKey: id, userId, provider (CLAUDE | OPENAI | GEMINI | GROK), encryptedKey, modelName, isActive, createdAt

3. AUTHENTICATION
   - Integrate Clerk with Next.js App Router
   - Create a Clerk webhook handler at /api/webhooks/clerk that syncs the Clerk user to the Neon User table on user.created and user.updated events
   - Protect all /dashboard/* routes with Clerk middleware
   - Public routes: /, /sign-in, /sign-up, /join/[code]

4. GROUP CREATION AND JOINING
   - Page: /dashboard/new-group
     Form: group name input, submit button
     On submit: create Group in DB, generate unique 8-character invite code, redirect to /dashboard/group/[id]
   - Page: /join/[code]
     Public page. Shows group name and member count.
     If user is signed in: "Join Group" button that adds them as a GroupMember.
     If user is not signed in: redirect to /sign-up?redirect=/join/[code]
   - API route: POST /api/groups — creates group
   - API route: POST /api/groups/join — joins group by invite code

5. SKILL PROFILE
   - After joining a group (or after sign-up), prompt user to complete their skill profile
   - Page: /dashboard/profile/setup
     Fields: languages known (multi-select: JavaScript, TypeScript, Python, Java, C++, Rust, Go, other), domains (multi-select: Frontend, Backend, DevOps, ML/AI, Hardware, Mobile, Design, Research), comfort level (radio: Beginner / Mid / Advanced)
     This data updates the User record.

6. PROJECT BRIEF FORM
   - Page: /dashboard/group/[id]/brief
   - Only accessible to group creator
   - Fields:
     - Idea statement (textarea)
     - Solution approach (textarea)
     - Deadline (date picker — must be in the future)
     - Scope statement (textarea, label: "What is in scope and what is out of scope?")
   - On submit: save to ProjectBrief table, trigger AI analysis (see step 7)

7. AI TASK ASSIGNMENT ENGINE
   - API route: POST /api/ai/assign-tasks
   - This route:
     a. Fetches the ProjectBrief and all GroupMembers with their User profiles
     b. Fetches the active AIKey for the session user (the group creator)
     c. Constructs a prompt that includes: idea, solution, deadline, scope, and each member's name + skills + level
     d. Calls the AI provider using Vercel AI SDK with the user's own decrypted key
     e. Expects the AI to return structured JSON: array of { userId, role, tasks: [{ title, description, estimatedDays }] }
     f. Saves roles to GroupMember, saves tasks to Task table
     g. Updates ProjectBrief status to ANALYSED
   - The system prompt for the AI must instruct it to:
     - Assign roles based on skills, not randomly
     - Keep task descriptions specific and actionable (not "work on backend" but "build the POST /api/groups endpoint with validation")
     - Ensure no two members have identical tasks
     - Balance workload relative to deadline
     - Return ONLY valid JSON, no prose

8. AI KEY SETTINGS PANEL
   - Page: /dashboard/settings/keys
   - For each provider (Claude, OpenAI, Gemini, Grok): a row with provider name, model name input, API key input (type=password with show/hide toggle), save button, delete button
   - Only one key can be set as active (radio or toggle)
   - Keys must be encrypted before saving to DB. Use AES-256 via the Node.js crypto module. Store the encryption key in env as AI_KEY_SECRET (32 chars).
   - Never return the decrypted key to the client. Decryption happens server-side only, at the moment of AI call.
   - Model switcher: dropdown of available models per provider. Can be changed at any time without affecting existing tasks.

9. TASK BOARD
   - Page: /dashboard/group/[id]/tasks
   - Shows all members and their tasks
   - Each task card: title, description, estimated days, status badge
   - Current user can update their own tasks only (NOT_STARTED → IN_PROGRESS → DONE)
   - Group creator can view all tasks but cannot mark others' tasks done
   - API route: PATCH /api/tasks/[id] — updates task status

10. GROUP DASHBOARD
    - Page: /dashboard/group/[id]
    - Shows: group name, invite code (with copy button), member list with roles, project brief summary, link to task board, link to brief form (if not submitted yet), project health score placeholder (show — but calculate it simply for now: % of tasks marked DONE)

Style requirements:
- Dark theme by default matching the Doom × Neon aesthetic described in GEMINI.md
- Use shadcn/ui components as the base but override with the colour tokens from GEMINI.md
- All forms must have proper loading states, error states, and success feedback
- All API routes must return consistent JSON: { success: boolean, data?: any, error?: string }
- TypeScript strict mode. No 'any' types unless absolutely unavoidable with a comment explaining why.

Do not implement:
- GitHub integration (Phase 2)
- Email sending (Phase 2)
- Nudge system (Phase 2)
- Stand-up bot (Phase 2)

Begin with the project setup and schema. Confirm the schema with me before running migrations. Then proceed feature by feature in the order listed above.
```

---

### PITSTOP 1 — Before closing Phase 1

Do all of these manually before starting Phase 2:

**Database**
- [ ] Open Neon dashboard → confirm all tables exist: User, Group, GroupMember, ProjectBrief, Task, AIKey
- [ ] Insert a test user manually and verify it syncs from Clerk webhook

**Auth flow**
- [ ] Sign up a new account → confirm User row created in Neon
- [ ] Sign in → confirm redirect to `/dashboard`
- [ ] Try accessing `/dashboard` without signing in → confirm redirect to `/sign-in`

**Group flow**
- [ ] Create a group → confirm invite code generated and displayed
- [ ] Open the invite link in an incognito window → sign up → join group → confirm GroupMember row created

**Skill profile**
- [ ] Complete skill profile after joining → confirm User row updated with skills and domains

**Project brief + AI assignment**
- [ ] Paste a real API key into settings (use your own Claude or Gemini key)
- [ ] Submit a project brief
- [ ] Confirm tasks are generated and displayed on the task board
- [ ] Confirm roles are assigned to members in the DB

**Task board**
- [ ] Mark one of your tasks as In Progress → confirm status badge updates
- [ ] Mark it as Done → confirm health score percentage changes on the dashboard

**Security**
- [ ] Open browser devtools → confirm no API keys visible in any network response
- [ ] Confirm `/api/ai/assign-tasks` returns 401 if called without a valid Clerk session

**Git — end of phase**
```bash
git add .
git commit -m "[phase-1] complete: MVP core — group creation, brief, AI assignment, task board"
git push origin phase-1
# Open PR: phase-1 → dev. Review the diff. Merge.
git checkout dev
git pull
git tag phase-1-complete
git push origin --tags
```

---

### POST-PHASE 1 CHANGELOG

After the merge, create this file in your repo as `changelogs/PHASE_1.md`:

```markdown
## Phase 1 — MVP Core — Completed

### What was built
- Next.js 14 App Router project with TypeScript, Tailwind, shadcn/ui
- Neon PostgreSQL database with Prisma ORM — 6 models: User, Group, GroupMember, ProjectBrief, Task, AIKey
- Clerk authentication with webhook sync to Neon User table
- Invite-code group creation and public join flow
- Skill profile form (languages, domains, comfort level)
- Project brief submission form with deadline and scope
- AI task assignment engine — reads brief + member profiles, assigns roles and tasks via user's own API key
- BYOK API key vault — AES-256 encrypted, supports Claude / OpenAI / Gemini / Grok
- Model switcher — change active model any time from settings
- Task board with per-member task cards and status updates
- Group dashboard with live health score (% tasks done)

### Where to check changes
- `/app/dashboard/` — all dashboard pages
- `/app/api/` — all API routes
- `/prisma/schema.prisma` — full database schema
- `/lib/ai.ts` — AI provider routing via Vercel AI SDK
- `/lib/crypto.ts` — key encryption/decryption
- `/components/` — UI components

### Known limitations at this stage
- No email sending yet
- No GitHub integration yet
- Health score is simple (% done) — full scoring in Phase 3
- No nudge system yet
```

---

## PHASE 2 — Intelligence Layer

**Goal:** Connect GitHub, track real commits against tasks, build the nag loop, add code review, daily stand-up bot.

**Branch to create before starting:**
```bash
git checkout dev
git checkout -b phase-2
```

---

### PROMPT — Phase 2

```
You are continuing to build Paceup. The MVP from Phase 1 is complete.
Read GEMINI.md for full project context before writing any code.

Phase 2 adds the intelligence layer. All Phase 1 code is already in place — do not rewrite it. Extend it.

What to build in this phase:

1. GITHUB REPO INTEGRATION
   - Add to the Group model: githubRepoUrl (nullable string), githubWebhookId (nullable string)
   - Page: /dashboard/group/[id]/settings
     Field: "GitHub repo URL" (format: https://github.com/owner/repo)
     On save: validate the URL, call GitHub API to confirm the repo exists and is accessible, register a webhook on the repo pointing to /api/webhooks/github with events: push, pull_request
     Store the webhook ID for later cleanup
   - GitHub webhook handler: POST /api/webhooks/github
     Verify the X-Hub-Signature-256 header using GITHUB_WEBHOOK_SECRET env var
     On push event: extract commits, store them in a new Commit table (see schema below)
     On pull_request event: store a PullRequest record

   New schema models to add:
   - Commit: id, groupId, authorGithubUsername, sha, message, filesChanged (JSON array of filenames), timestamp
   - PullRequest: id, groupId, number, title, authorGithubUsername, status (OPEN | MERGED | CLOSED), createdAt

2. COMMIT-TO-TASK MATCHING
   - After storing commits, run an async job (inline async function, not a queue yet):
     a. Fetch all DONE or IN_PROGRESS tasks for the group
     b. For each commit, use the AI (with the group creator's active key) to determine which task this commit most likely contributes to, based on the commit message and files changed
     c. Store the match as a CommitTaskLink: commitId, taskId, confidence (HIGH | MEDIUM | LOW)
   - Page: /dashboard/group/[id]/commits
     Shows a feed of all commits, grouped by member, with matched tasks shown alongside

3. CONFLICT DETECTOR
   - After storing commits, check: did any two members push commits to the same file within the same calendar day?
   - If yes: create a ConflictAlert record: id, groupId, filename, memberIds (JSON array), detectedAt, resolvedAt (nullable)
   - Display unresolved conflicts as a warning banner on the group dashboard
   - Each conflict card shows: filename, which members touched it, timestamps of their commits
   - "Mark resolved" button dismisses the alert

4. DAILY STAND-UP BOT
   - New schema model:
     - StandupResponse: id, userId, groupId, date (date only, not datetime), didYesterday (text), planToday (text), blockers (text, nullable), submittedAt
   - Page: /dashboard/group/[id]/standup
     Shows today's stand-up form for the current user if they have not yet submitted today
     After submit: shows the full group's responses for today (all members who have submitted)
   - API route: POST /api/standup — saves the response
   - API route: GET /api/standup?groupId=[id]&date=[YYYY-MM-DD] — fetches all responses for that day
   - For now, the standup is manual navigation. Email reminders come in the nag loop step below.

5. NAG LOOP — EMAIL + IN-APP NOTIFICATIONS
   - New schema model:
     - Notification: id, userId, groupId, type (TASK_OVERDUE | STANDUP_MISSING | CONFLICT_DETECTED | REVIEW_REQUIRED), message, readAt (nullable), createdAt
   - API route: POST /api/notifications/mark-read/[id] — marks a notification read
   - Notification bell in the nav: shows unread count badge, dropdown lists recent notifications
   - Nag loop logic — create a Next.js route handler at /api/cron/nag that:
     a. Finds all tasks where status is NOT DONE and deadline (estimated from task createdAt + estimatedDays) has passed → mark as OVERDUE, create TASK_OVERDUE Notification for the assigned user
     b. Finds all users in active groups who have not submitted a standup today → create STANDUP_MISSING Notification
     c. Sends an email via Resend for each notification (one email per user per day maximum — do not spam)
   - Wire this cron route to Vercel Cron (vercel.json) to run daily at 08:00 IST (02:30 UTC)
   - Email templates: build with React Email. Two templates:
     - TaskOverdueEmail: shows task name, how many days overdue, link to task board
     - StandupReminderEmail: shows group name, link to standup page

6. CODE REVIEW AGENT
   - API route: POST /api/ai/review-code
     Input: taskId (the task being reviewed)
     Process:
       a. Fetch all commits linked to this task via CommitTaskLink
       b. For each commit, fetch the file diffs from GitHub REST API (GET /repos/{owner}/{repo}/commits/{sha})
       c. Build a review prompt: here are the diffs for task "[task title]" assigned to "[member name]" — review for correctness, code quality, and whether the task requirements are met
       d. Call AI with the user's active key
       e. Return: { passed: boolean, feedback: string, issues: string[] }
   - Store result as a CodeReview: id, taskId, reviewedBy (userId of creator), result (PASS | FAIL | NEEDS_REVISION), feedback (text), issues (JSON array), createdAt
   - If FAIL or NEEDS_REVISION: create a REVIEW_REQUIRED Notification for the task owner, attribute the issue to them specifically in the message ("Your module [task title] has review feedback from the AI leader")
   - Task board: show a "Request Review" button on tasks marked DONE. Shows review result badge after review is run.

7. UPDATED GROUP DASHBOARD
   - Add to the group dashboard:
     - Recent commits feed (last 5)
     - Unresolved conflict count badge
     - Stand-up completion for today (X/N members submitted)
     - Latest code review results summary

Style and quality requirements (same as Phase 1):
- No 'any' types
- All routes return { success, data, error }
- Proper loading, error, and empty states on all new pages
- GitHub webhook handler must verify signature before processing — reject with 401 if invalid
- Resend emails must only send if RESEND_API_KEY is set in env — fail silently in dev, log a warning

Do not implement:
- Hardware project mode (Phase 3)
- Mentor invite (Phase 3)
- Gantt view (Phase 3)
- Public portfolio (Phase 4)

Extend Phase 1 code. Do not rewrite what already works.
```

---

### PITSTOP 2 — Before closing Phase 2

**GitHub integration**
- [ ] Link a real test repo to a test group
- [ ] Make a commit to the test repo → confirm it appears in the commits feed
- [ ] Confirm the webhook signature verification rejects a tampered request (test with curl)

**Conflict detector**
- [ ] Commit to the same file from two test accounts on the same day
- [ ] Confirm a ConflictAlert is created and the warning banner appears on the dashboard

**Stand-up bot**
- [ ] Submit a standup as one member → confirm it appears in the group view
- [ ] Do NOT submit as the second member → confirm Notification created at cron time

**Nag loop**
- [ ] Manually call `/api/cron/nag` (GET with a secret header) → confirm OVERDUE tasks get notifications
- [ ] Check Resend dashboard → confirm email was queued (do not spam — test with your own email)

**Code review**
- [ ] Mark a task DONE → confirm "Request Review" button appears
- [ ] Run review → confirm result is stored and badge appears
- [ ] If FAIL → confirm Notification created for the task owner

**Git — end of phase**
```bash
git add .
git commit -m "[phase-2] complete: GitHub integration, nag loop, code review, stand-up bot"
git push origin phase-2
# PR: phase-2 → dev. Review. Merge.
git checkout dev && git pull
git tag phase-2-complete && git push origin --tags
```

---

### POST-PHASE 2 CHANGELOG

Create `changelogs/PHASE_2.md`:

```markdown
## Phase 2 — Intelligence Layer — Completed

### What was built
- GitHub repo linking per group with webhook registration
- Commit ingestion and storage (Commit model)
- Commit-to-task matching via AI (CommitTaskLink model)
- Conflict detector: flags when two members push to the same file same day
- Daily stand-up bot: per-member form, group view, daily response log
- Nag loop: cron job at 08:00 IST, in-app notifications + Resend emails
- Code review agent: fetches diffs, AI reviews against task requirements
- Error attribution: FAIL reviews create notifications naming the responsible member
- Vercel Cron configured for daily nag at 02:30 UTC

### Where to check changes
- `/app/api/webhooks/github.ts` — commit and PR ingestion
- `/app/api/ai/review-code.ts` — code review agent
- `/app/api/cron/nag.ts` — nag loop cron handler
- `/app/dashboard/group/[id]/commits` — commit feed
- `/app/dashboard/group/[id]/standup` — stand-up page
- `/emails/` — React Email templates
- `/prisma/schema.prisma` — Commit, PullRequest, StandupResponse, Notification, CodeReview, ConflictAlert models

### Known limitations at this stage
- Hardware mode not yet supported (Phase 3)
- Gantt view not yet built (Phase 3)
- Stand-up reminders are notification-only in dev (cron runs on Vercel only)
```

---

## PHASE 3 — Collaboration Layer

**Goal:** Submission portal, AI review reports, hardware mode, mentor access, Gantt view, group analytics.

**Branch:**
```bash
git checkout dev && git checkout -b phase-3
```

---

### PROMPT — Phase 3

```
You are continuing to build Paceup. Phases 1 and 2 are complete.
Read GEMINI.md for full project context before writing any code.

Phase 3 adds the collaboration layer. Extend existing code only — do not rewrite Phase 1 or 2.

What to build:

1. SUBMISSION PORTAL
   - New schema model:
     - Submission: id, taskId, userId, groupId, fileUrl (nullable), notes (text), submittedAt, reviewStatus (PENDING | REVIEWED), aiReviewId (nullable)
   - Page: /dashboard/group/[id]/submit
     Member selects which of their tasks they are submitting
     Uploads a file (use Vercel Blob for storage) or pastes a GitHub PR URL or writes submission notes
     Submits to AI leader for review
   - On submission: trigger the AI review (reuse code review agent from Phase 2 if it's a code submission, or use a document review prompt if it's notes/docs)
   - Store result as AIReview: id, submissionId, result (PASS | FAIL | NEEDS_REVISION), feedback, issues (JSON), createdAt

2. AI REVIEW REPORT PAGE
   - Page: /dashboard/group/[id]/reviews
   - Shows all submissions and their AI review results
   - Per submission: member name, task name, submission date, result badge, full feedback, list of issues
   - Group creator can download a full review summary as PDF (use @react-pdf/renderer)
   - If NEEDS_REVISION: show a "Re-submit" button on the member's task card that links back to the submission portal

3. HARDWARE PROJECT MODE
   - On the project brief form: add a toggle "Hardware project"
   - If hardware mode is on:
     - The AI assignment engine adjusts its prompt to assign hardware-specific roles (Circuit Design, Firmware, Enclosure, Documentation, Testing)
     - Code review agent is disabled for hardware projects
     - Submission portal accepts: PDF, images, circuit diagrams, datasheets
     - Review prompt changes: "Review this hardware documentation for completeness, correctness, and whether it meets the task specification"
   - Store mode on ProjectBrief: isHardwareMode (boolean, default false)

4. HANDOFF SUMMARIES
   - When a member marks a task as DONE:
     - Auto-trigger: POST /api/ai/handoff-summary with the taskId
     - AI generates a brief (3–5 bullet points): what was built, what interfaces it exposes, what the next integrating member needs to know
     - Store as HandoffSummary: id, taskId, summary (text), generatedAt
   - Display on the task card: a "Handoff Notes" collapsible section visible to all group members

5. MENTOR / TA INVITE
   - New schema model:
     - MentorAccess: id, groupId, mentorEmail, inviteToken (unique), acceptedAt (nullable), createdAt
   - Page: /dashboard/group/[id]/settings → "Invite Mentor" section
     Input: mentor's email address
     On submit: send an email with a unique invite link: /mentor/[token]
   - Page: /mentor/[token] — public page
     If not signed in: prompt to sign in or create account
     If valid token: accept the invite, create MentorAccess record with acceptedAt
   - Mentor dashboard: /mentor/[groupId]
     Read-only view showing: member list, task board, commit feed, review results, health score
     Cannot create, edit, or submit anything
     Cannot see API keys

6. PROJECT HEALTH SCORE — FULL CALCULATION
   Replace the simple (% done) score with a weighted calculation:
   - 30% — tasks completed on time (completed before their estimated deadline)
   - 25% — commit activity (at least one commit per active member per week = full marks)
   - 20% — stand-up completion rate (X/N members submitting each day)
   - 15% — code review pass rate (if applicable)
   - 10% — conflict resolution speed (conflicts resolved within 24h = full marks)
   Display as a circular progress gauge on the group dashboard.
   Show a tooltip breaking down each component score on hover.

7. MILESTONE TIMELINE VISUALISER (GANTT)
   - Page: /dashboard/group/[id]/timeline
   - Display a horizontal Gantt chart built with plain SVG (no library):
     - Y axis: one row per task
     - X axis: project start date to deadline
     - Each bar: task start (createdAt) to estimated end (createdAt + estimatedDays)
     - Bar colour: green if DONE, amber if IN_PROGRESS, red if OVERDUE, grey if NOT_STARTED
     - Today line: a vertical red dashed line at today's date
   - No drag-and-drop in Phase 3. View only.

8. GROUP ANALYTICS
   - Page: /dashboard/group/[id]/analytics
   - Three sections:
     a. Contribution heatmap: GitHub-calendar style grid, one square per day, colour intensity = number of commits that day, per member
     b. Activity streaks: longest consecutive days with at least one commit, per member
     c. Task velocity: line chart (recharts) showing tasks completed per week over the project lifetime

Quality requirements (same as all phases):
- No any types
- All routes return { success, data, error }
- Vercel Blob upload: validate file type and size (max 10MB) server-side before accepting
- Mentor routes must check MentorAccess before serving any data — do not rely on client-side hiding

Do not implement:
- Public portfolio (Phase 4)
- Hackathon mode (Phase 4)
- Mobile app (Phase 4)
```

---

### PITSTOP 3 — Before closing Phase 3

**Submission portal**
- [ ] Submit a task as a code submission → confirm AI review runs and result appears
- [ ] Submit as a document (PDF) in hardware mode → confirm hardware review prompt is used
- [ ] Download the full group review summary PDF → confirm it generates

**Mentor access**
- [ ] Send mentor invite to your own secondary email
- [ ] Accept the invite → confirm read-only dashboard is accessible
- [ ] Try to mark a task done as the mentor → confirm it is blocked

**Health score**
- [ ] Check all 5 components are visible in the tooltip breakdown
- [ ] Mark tasks done, submit standups, make commits → confirm score updates

**Timeline**
- [ ] Confirm bars are sized correctly to the project date range
- [ ] Confirm today line is at the correct position
- [ ] Confirm overdue tasks show red bars

**Git — end of phase**
```bash
git add .
git commit -m "[phase-3] complete: submission portal, AI reviews, hardware mode, Gantt, analytics"
git push origin phase-3
# PR: phase-3 → dev. Review. Merge.
git checkout dev && git pull
git tag phase-3-complete && git push origin --tags
```

---

### POST-PHASE 3 CHANGELOG

Create `changelogs/PHASE_3.md`:

```markdown
## Phase 3 — Collaboration Layer — Completed

### What was built
- Submission portal with Vercel Blob file upload and GitHub PR URL support
- AI review report page with per-member feedback and PDF export
- Hardware project mode: adjusted role assignment, document review, no code review
- Handoff summaries: auto-generated when task marked DONE, visible to all members
- Mentor/TA invite system with read-only dashboard access
- Full health score calculation (5 weighted components)
- Milestone Gantt chart (SVG, view-only)
- Group analytics: contribution heatmap, activity streaks, task velocity chart

### Where to check changes
- `/app/dashboard/group/[id]/submit` — submission portal
- `/app/dashboard/group/[id]/reviews` — AI review report
- `/app/dashboard/group/[id]/timeline` — Gantt chart
- `/app/dashboard/group/[id]/analytics` — analytics dashboard
- `/app/mentor/[token]` and `/app/mentor/[groupId]` — mentor access
- `/app/api/ai/handoff-summary.ts` — handoff summary generation
- `/lib/health-score.ts` — health score calculation

### Known limitations at this stage
- Gantt is view-only (no drag to adjust dates)
- Analytics heatmap is commit-count only (no task-weighted activity)
- Mobile layout is functional but not optimised (Phase 4 mobile app)
```

---

## PHASE 4 — Scale and Polish

**Goal:** Public portfolio, institution mode, hackathon mode, AI persona tuning, skill graph, monetisation, mobile optimisation.

**Branch:**
```bash
git checkout dev && git checkout -b phase-4
```

---

### PROMPT — Phase 4

```
You are continuing to build Paceup. Phases 1, 2, and 3 are complete.
Read GEMINI.md for full project context before writing any code.

Phase 4 is scale, polish, and monetisation. Extend existing code only.

What to build:

1. PUBLIC PROJECT SHOWCASE
   - Add to ProjectBrief: isPublic (boolean, default false)
   - Group creator can toggle visibility in group settings
   - Public page: /projects/[groupId]
     Shows: project name, idea summary, solution summary, team member names (no emails), task list (titles only, no descriptions), health score at completion, tech stack tags
   - Index page: /projects — shows all public projects, filterable by domain and status

2. INSTITUTION MODE
   - New schema models:
     - Institution: id, name, domain (email domain, e.g. "college.edu"), adminUserId, createdAt
     - InstitutionGroup: id, institutionId, groupId, courseCode (nullable), addedAt
   - Admin can claim an institution by verifying their email domain
   - Admin dashboard: /institution/[id]
     Shows all groups linked to their institution
     Per group: health score, member count, submission status, deadline
     Can export a CSV of all groups and scores
   - Students with a matching email domain see a banner offering to link their group to their institution

3. HACKATHON MODE
   - On group creation: toggle "Hackathon mode"
   - If on: deadline is required and cannot be more than 72 hours from now
   - AI assignment prompt changes: tasks are more granular (2–4 hour estimates), focused on a working demo
   - Live leaderboard page: /dashboard/group/[id]/leaderboard
     Shows all members ranked by: commits in the last 6h, tasks completed, health score contribution
     Auto-refreshes every 60 seconds

4. AI LEADER PERSONA
   - Add to Group: aiPersona (STRICT | COACH | FLEXIBLE, default COACH)
   - Group creator can change this in settings
   - STRICT: nags every day, no extensions, review failures block submission
   - COACH: nags after 2 days overdue, gives constructive feedback, suggests how to fix issues
   - FLEXIBLE: nags only when deadline is within 48h, feedback is encouraging
   - All AI prompts (assignment, review, stand-up, handoff) must include persona context

5. CROSS-PROJECT SKILL GRAPH
   - Page: /dashboard/profile/skills
   - After each project is completed (all tasks DONE or deadline passed):
     Record which tasks this user completed, what domain they were in, and the code review pass rate
   - Visualise as a radar chart (recharts): axes are domains (Frontend, Backend, etc.), size = number of tasks completed in that domain across all projects
   - Show a "strongest area" badge and a "suggested next challenge" recommendation from AI

6. MONETISATION — FREE AND PRO TIERS
   - Add to User: plan (FREE | PRO), stripeCustomerId (nullable), stripeSubscriptionId (nullable)
   - Free tier limits:
     - 1 active group at a time
     - 1 AI provider key saved
     - No mentor invite
     - No PDF export
     - No public portfolio
   - Pro tier ($5/month — implement with Stripe):
     - Unlimited groups
     - All providers
     - All features
   - Page: /dashboard/billing — shows current plan, upgrade button, Stripe customer portal link
   - Stripe webhook handler: /api/webhooks/stripe — updates user plan on subscription events
   - All gated features must check the user's plan server-side before serving. Client-side hiding is not sufficient.

7. MOBILE OPTIMISATION
   - Audit all pages for mobile layout (viewport 375px)
   - Priority pages to fix: task board, group dashboard, stand-up form, AI key settings
   - Navigation: replace sidebar with bottom tab bar on mobile
   - All touch targets minimum 44x44px

Quality requirements:
- Stripe webhook must verify the stripe-signature header before processing
- Institution admin must be verified before accessing institution dashboard
- All plan checks server-side — never trust the client
- Radar chart must be accessible (aria-label with data summary)
```

---

### PITSTOP 4 — Before closing Phase 4

- [ ] Set a group to public → confirm it appears on /projects
- [ ] Test institution email domain matching with a test email
- [ ] Create a hackathon group → confirm 72h deadline enforcement
- [ ] Change AI persona to STRICT → confirm nag emails reflect stricter tone
- [ ] Test Stripe checkout → confirm plan upgrades to PRO in DB
- [ ] Try accessing a PRO feature as a FREE user → confirm server-side block
- [ ] Test all priority pages on a 375px viewport

**Git — end of phase**
```bash
git add .
git commit -m "[phase-4] complete: portfolio, institution mode, hackathon, persona, billing"
git push origin phase-4
# PR: phase-4 → dev. Review. Merge.
# PR: dev → main. Final review. Merge.
git checkout main && git pull
git tag v1.0.0 && git push origin --tags
```

---

### POST-PHASE 4 CHANGELOG

Create `changelogs/PHASE_4.md`:

```markdown
## Phase 4 — Scale and Polish — Completed

### What was built
- Public project showcase with index and filterable listing
- Institution mode with admin dashboard and CSV export
- Hackathon mode with live leaderboard (60s auto-refresh)
- AI leader persona: Strict / Coach / Flexible — affects all AI prompts
- Cross-project skill radar chart with AI-suggested next challenge
- Stripe monetisation: Free and Pro tiers with server-side plan enforcement
- Mobile layout audit and bottom tab navigation for mobile

### Where to check changes
- `/app/projects/` — public showcase
- `/app/institution/` — institution admin
- `/app/dashboard/group/[id]/leaderboard` — hackathon leaderboard
- `/app/dashboard/profile/skills` — skill radar
- `/app/dashboard/billing` — Stripe billing
- `/app/api/webhooks/stripe.ts` — Stripe webhook handler
- `/lib/plan-check.ts` — server-side plan enforcement

### v1.0.0 — Production ready
```

---

*Paceup — Built for teams that actually want to finish.*