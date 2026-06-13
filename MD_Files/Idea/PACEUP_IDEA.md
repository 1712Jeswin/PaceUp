# Paceup — Built for teams that actually want to finish.

> **One-line pitch:** Paceup is an AI project leader for student teams — it reads your idea, assigns roles based on who you are, watches your GitHub, and nags you until the project ships.

---

## The Problem

Every student project group faces the same collapse pattern:

- No one takes real ownership of leadership
- Tasks get assigned informally and forgotten
- Members drift into working on whatever interests them
- The project ends up half-finished, or "mid" — functional in places, broken everywhere else
- Accountability exists only right before the deadline

Existing tools like Notion, Trello, or Asana assume a team that already knows how to self-organise. They don't solve the leadership vacuum — they assume it doesn't exist. Students don't need another kanban board. They need someone to tell them what to do and hold them to it.

---

## The Solution — Paceup

Paceup puts an AI in the leadership seat. It reads the project brief, learns who each member is, assigns work intelligently, watches GitHub for what's actually being done, and closes the gap between "assigned" and "done" with a structured accountability loop.

It is not a to-do list. It is a team lead that never sleeps.

---

## Core Concept — The AI Leader Model

When a project starts, the AI leader receives:

- The project idea and solution statement
- The number of members and their deadline
- The scope of the project (what's in, what's out)
- Each member's skill profile (languages, domains, experience level)

From this, it generates:

- A role for each member (e.g. "Backend Engineer", "UI Lead", "Hardware Integration")
- A breakdown of tasks per role, with estimated timeframes
- A milestone map from start to final submission

Once the project is running, the AI leader:

- Monitors GitHub commits and compares them against assigned tasks
- Sends daily stand-up prompts to each member
- Tracks who is on pace, who is falling behind, and who is touching the wrong files
- Reviews submitted work and generates per-member feedback
- Traces errors in the codebase back to the responsible member and asks them to fix it
- Escalates with email + in-app notifications when tasks are overdue

---

## BYOK — Bring Your Own Key

Paceup does not charge for AI usage. Instead, each student pastes their own API keys. This solves the biggest adoption blocker for student tools: cost.

Supported providers from day one:

| Provider | Model examples |
|---|---|
| Anthropic (Claude) | claude-sonnet-4-6, claude-haiku-4-5 |
| OpenAI | gpt-4o, gpt-4o-mini |
| Google (Gemini) | gemini-1.5-pro, gemini-flash |
| xAI (Grok) | grok-2 |

Keys are stored encrypted per user. The active model can be changed at any point in the project — not just at setup. Different actions can use different models (e.g. fast analysis on Flash, deep code review on Sonnet).

---

## Added Intelligence Features

### Conflict Detector
If two members commit to the same file on the same day, the AI flags it as a potential overlap and asks them to coordinate before merging. Directly addresses the "everyone doing random things" problem at the code level.

### Daily Stand-up Bot
Every morning, each member receives one automated prompt:
- What did you do yesterday?
- What's your plan today?
- Any blockers?

Responses are logged and surfaced in a shared group view. No meeting needed.

### Project Health Score
A live 0–100 score visible on the dashboard, computed from:
- Commits this week vs expected pace
- Tasks completed on time
- Test cases passing (if code project)
- Deadline proximity

Gamifies accountability without being punitive.

### Idea Validation Mode
Before tasks are assigned, the AI reviews the project idea itself and flags issues:
- "This scope is too broad for 4 people in 6 weeks — consider cutting X"
- "No clear deliverable defined — what does the final output look like?"
- "This problem is already solved by [tool] — consider a different angle"

### Handoff Summaries
When a member marks their module complete, the AI auto-generates a brief summary:
what was built, what APIs or interfaces it exposes, and what the next member needs to know to integrate with it. Prevents integration hell at the end of the project.

---

## MVP — What Ships First

The MVP proves one thing: **an AI can read a project brief and tell each person exactly what to do.**

### MVP Screens (5 total)

**1. Create / Join Group**
- Member creates a group and gets an invite code
- Others join with the code
- Each member fills in a skill profile: languages, domains, comfort level (beginner / mid / advanced)

**2. Project Brief Form**
- Idea statement (free text)
- Solution approach (free text)
- Number of members (auto-filled from group)
- Project deadline (date picker)
- Scope statement (one paragraph: what's in, what's out)

**3. AI Assignment View**
- Output from the AI leader
- Each member's name → assigned role → 3 tasks → estimated timeframe per task
- Member can flag "I can't do this" and the AI reassigns

**4. API Key Settings Panel**
- 4 rows: Claude, OpenAI, Gemini, Grok
- Password-type input per row
- Model dropdown per provider
- One active toggle — this is the model the AI uses
- Switch model any time, no project restart needed

**5. Task Board**
- Per-member task list
- "Mark done" button per task
- Status badge: Not started / In progress / Done / Overdue
- Simple, no drag-and-drop in MVP

### MVP Does NOT Include
- GitHub integration
- Email nudges
- Code review
- Stand-up bot
- Analytics

---

## Phase Breakdown — MVP to Full Product

### Phase 1 — MVP Core (Weeks 1–6)
- Invite-code group creation
- Project brief form
- Member skill profiles
- AI role and task assignment engine
- BYOK API key vault (Claude, OpenAI, Gemini, Grok)
- Model switcher (change active model any time)
- Basic task board with status tracking

### Phase 2 — Intelligence Layer (Weeks 7–14)
- GitHub repo link per project
- AI reads commit diffs, tracks who changed what
- Daily progress check: commits compared against assigned tasks
- Conflict detector: flags when two members touch the same file
- Smart nag loop: in-app + email notification when task is overdue
- Code review agent: runs code, checks test cases, flags errors
- Error tracing: maps bug to the member who authored that module
- Stand-up bot: daily prompts, shared response log

### Phase 3 — Collaboration Layer (Weeks 15–24)
- In-app submission portal: members upload deliverables to AI leader
- AI review report: per-member feedback, score, required fixes
- Hardware project mode: replace code review with doc and diagram review
- Handoff summaries: auto-generated when a module is marked complete
- Mentor invite: teacher or TA gets a read-only dashboard view
- Milestone timeline visualiser: Gantt-style view of task progress
- Group analytics: contribution heatmap, activity streaks, health score

### Phase 4 — Scale and Polish (Month 6+)
- Public project showcase: optional portfolio export per member
- Institution mode: colleges add projects and monitor all groups
- Hackathon mode: time-boxed sprint with live leaderboard
- AI leader persona tuning: Strict / Coach / Flexible modes
- Cross-project skill graph: track what each member has mastered over time
- Monetisation: free tier (1 active project, 1 AI provider), pro tier (unlimited)
- Mobile app (React Native): stand-up prompts and nudges as push notifications

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, serverless-ready, great DX |
| Database | Neon (PostgreSQL) | Serverless Postgres, generous free tier, pairs with Vercel |
| ORM | Prisma | Type-safe queries, clean migrations, works perfectly with Neon |
| Auth | Clerk | Hosted auth, invite flows, multi-session, zero maintenance |
| Email | Resend | Developer-first transactional email, React Email templates |
| Queue / Rate limit | Upstash Redis | Serverless-compatible, used for nag loop scheduling |
| AI routing | Vercel AI SDK | Unified interface across all BYOK providers |
| Hosting | Vercel | Native Next.js hosting, serverless functions, edge ready |
| GitHub integration | GitHub REST API + Webhooks | Commit tracking, file diff reading, repo events |

---

## Who This Is For

**Primary:** Engineering and CS students building semester projects, capstone projects, or hackathon submissions in groups of 2–6.

**Secondary:** Any student project group regardless of discipline — hardware, design, research — where coordination and accountability are the bottleneck.

**Long-term:** Institutions that want visibility into student project health without manual check-ins.

---

## What Makes Paceup Different

| Feature | Paceup | Notion | Asana | Linear |
|---|---|---|---|---|
| Built for students | ✅ | ❌ | ❌ | ❌ |
| AI assigns roles from a brief | ✅ | ❌ | ❌ | ❌ |
| BYOK — no platform AI cost | ✅ | ❌ | ❌ | ❌ |
| GitHub commit tracking | ✅ | ❌ | ❌ | Partial |
| Accountability nudge loop | ✅ | ❌ | Partial | ❌ |
| Error traced to author | ✅ | ❌ | ❌ | ❌ |
| Free for students | ✅ | Partial | ❌ | ❌ |

---

*Paceup — Built for teams that actually want to finish.*