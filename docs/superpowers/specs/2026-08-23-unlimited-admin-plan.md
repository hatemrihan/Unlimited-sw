# Unlimited Admin — Coach & Admin Dashboard Plan

**Date:** 23 Aug 2026 · **Status:** ✅ decisions locked 23 Aug (see §7) — A1 architecture next
**Who it serves:** the head coach (daily delivery work) and Hatem (money, moderation, settings)
**Who builds it:** the plan is written to hand to a developer; Claude supports/reviews per Hatem's workflow rules.

---

## 1. First, a correction to the request: there is NO new database

You asked for "admin new database" — stop there. **The admin is a window onto the database you already built.** The InstaPay screenshot the admin approves is the `orders` row the app created; the plan the coach assigns must land in the same `enrollments` row the athlete's phone is watching live. A second database would mean syncing two truths — that's how money disappears.

What "database work" the admin actually needs, all inside the **existing** Supabase project:
- **Nothing for v1 queues** — the tables, functions (`mark_order_paid`, `reject_order`, `assign_plan_to_enrollment`, `extend_enrollment`, `register_for_competition`) and RLS already exist. You wrote five of the files yourself.
- Possibly a few **read-only SQL views** later (e.g. `admin_orders_queue` joining order + athlete profile + program title) purely for convenience — added as new migration files when a screen proves it needs one. Never new tables for admin's sake.

Same logic for **"new backend"**: the backend already exists and is deliberately tiny — Postgres functions + RLS *are* the backend; the FastAPI service only receives Paymob webhooks and sends pushes. Admin buttons call the existing functions via `supabase.rpc(...)`. New backend code only appears if a feature genuinely can't be a SQL function (none of v1 qualifies).

**What is genuinely new: the frontend.** That's this plan.

## 2. What the admin actually does — screens by persona

### Head coach (daily)
| Screen | Backed by |
|---|---|
| **Enrollment queue** — new submissions awaiting review | `enrollments` (status `awaiting_coach`) + `assessment_submissions/answers` (incl. photos/videos from the private bucket) |
| **Assign program** — pick template plan or build custom, approve → clock starts | `plans` tree + `assign_plan_to_enrollment()` |
| **Plan builder** — weeks → days → exercises from the video library | `plans`, `plan_weeks`, `plan_days`, `plan_exercises`, `videos` |
| **Video library** — upload/categorize the 500+ videos | `videos`, `video_categories` + streaming provider |
| **My athletes** — active enrollments, expiry dates, extend button | `enrollments` + `extend_enrollment()` |
| **Chat** — answer athletes | `conversations`, `messages` (same Realtime the app uses) |
| **Earnings** — computed, read-only | paid `orders` × `coach_split_percent` snapshot |

### Admin / Hatem
| Screen | Backed by |
|---|---|
| **InstaPay review queue** — screenshot → approve/reject | `orders` (status `awaiting_review`) + `mark_order_paid()` / `reject_order()` |
| **Programs CRUD** — prices (EGP/SAR/AED), publish, slugs | `programs` |
| **Competitions** — create, publish, registrations list | `competitions`, `competition_registrations` |
| **Moderation queue** — reports on posts/comments/reviews/profiles | `reports` + ban/remove actions |
| **Users** — search, roles, ban | `profiles`, `coaches` (incl. the split — guarded by your trigger) |
| **Settings** — InstaPay number, WhatsApp, force-update | `app_settings` |
| **Audit log** — who did what | `audit_log` (read-only) |

v1 skips: analytics dashboards (Supabase Studio answers ad-hoc questions), guides editor (website's job), nutrition (not in the DB — separate decision someday).

## 3. The frontend decision — the one big choice (§6 D-A1)

History, honestly: on 9 Aug you locked "coach/admin dashboards on phone and laptop via **Flutter web**"; on 10 Aug you locked "everything web lives **inside unlimited-sw**"; today you said "**new frontend**". These conflict, so it's yours to settle:

| Option | What it is | For | Against |
|---|---|---|---|
| **A. New Next.js app** (`Unlimited-Main/unlimited-admin/`, deployed at `admin.unlimited-sw.com`) | Fresh shadcn/Tailwind app, supabase-js, nothing but admin | Clean start; tech your dev already knows from the store; fast tables/forms; store admin stays untouched; no store-deploy risk | A third codebase; coach on phone = responsive web, not native |
| **B. Inside unlimited-sw `/admin`** | New pages in the store's existing admin | One deploy, one login habit | Couples app-admin releases to the store; mixes Mongo-store admin with Supabase-app admin — confusing to work in; store deploy breaks = coach blocked |
| **C. Flutter web** (same codebase as the app) | Coach screens shared with the mobile app | One codebase for coach phone+web; M3 already plans coach screens in-app | Flutter web is weak at dense desktop tables/forms (the admin's bread and butter); your app dev is busy with athlete UI |

**My recommendation: A**, with one nuance — the **coach's daily tools also live in the Flutter app eventually** (M3 of the app plan, unchanged): coach approves/chats from his phone natively, while the web admin is the desktop power tool. Money/moderation/settings = web only.

## 4. Architecture (if A)

```
unlimited-admin (Next.js 15 + shadcn + supabase-js)
   │  signs in with Supabase Auth (email; role must be coach|admin — RLS enforces anyway)
   ├── reads tables directly (RLS gives coach/admin their scopes — already written)
   ├── writes money/status ONLY via supabase.rpc(existing functions)
   ├── uploads videos → streaming provider (Bunny) → saves provider_video_id
   └── subscribes Realtime: orders queue, enrollments queue, chat
Supabase (the ONE database)          FastAPI (unchanged: webhooks + push)
```

- **Auth:** Supabase Auth session in the browser; a server-side layout guard checks `profiles.role in ('coach','admin')` — but the real wall stays RLS + `security definer` functions + your split-guard trigger. The frontend can't do what the database forbids.
- **No service_role key anywhere in this app.** Ever. If a screen "needs" it, the design is wrong — we add a SQL function instead.
- **i18n:** admin ships **Arabic-first with EN toggle** (the coach works in Arabic; you both read English) — decide in §6.
- Repo layout stays two-plus-one: `Unlimited-sw/` (store), `Unlimited_app/` (app), `unlimited-admin/` (new).

## 5. Build phases (each = one usable slice, mirrors how we did everything else)

| Phase | Delivers | Exit demo |
|---|---|---|
| **A1 Foundation** | Repo scaffold, Supabase auth, role guard, shell/nav, deploy to `admin.unlimited-sw.com` | Hatem signs in, sees empty dashboard; a non-admin gets bounced |
| **A2 Money** | InstaPay queue (screenshot viewer, approve/reject), orders list, settings page | A test InstaPay order approved on the web appears active in the athlete app |
| **A3 Delivery** | Enrollment queue, assessment viewer (private media), template assign + approve, extend button | Coach onboards a paying athlete start-to-finish on the web |
| **A4 Plan builder + videos** | Plan tree editor, video upload (Bunny) + categorization | Coach builds a custom plan from his own videos |
| **A5 Community & control** | Moderation queue, competitions CRUD, users/roles, audit log viewer, earnings | A reported post handled; a competition published to the app |

Ordering matches business risk (money first), and A2–A3 are what unblocks *selling* — the athlete app's M2 needs the InstaPay approval screen to exist.

## 6. Decisions for Hatem (answer these, then the developer brief gets written)

| # | Decision | Options | My rec |
|---|---|---|---|
| D-A1 | Frontend platform & home | A / B / C from §3 | **A** — new Next.js app |
| D-A2 | Who codes it | your developer from a brief / Claude with your names / mixed | your call — plan is written for a developer |
| D-A3 | Does the UI-first rule apply here too? | you design admin screens first, or shadcn defaults now and restyle later | **shadcn defaults** — admin is a tool; polish spends better on the athlete app |
| D-A4 | Language | AR-first + EN toggle / EN only v1 | AR-first if the coach prefers Arabic |
| D-A5 | Video provider (unblocks A4 and app M3) | Bunny Stream (my rec, ~10× cheaper for MENA) / Mux | Bunny |
| D-A6 | Domain | `admin.unlimited-sw.com` (needs one DNS record) / separate domain | subdomain |

**Answer with e.g. "A, developer, defaults, AR-first, Bunny, subdomain" and the next deliverable is the A1+A2 developer brief** — same format as the SEO briefs: exact files, exact acceptance checks, handed to your developer.

## 7. Decisions locked (Hatem, 23 Aug 2026)

| # | Decision | Locked answer |
|---|---|---|
| D-A1 | Platform | **A — new Next.js + shadcn app** (`unlimited-admin/`, at `admin.unlimited-sw.com`) |
| D-A2 | Who codes | **Claude with Hatem's names** — architecture together, Hatem names classes/files, built in-session |
| D-A4 | Language | **Arabic-first + EN toggle**, RTL from day one |
| Nutrition | Scope | **Not v1 — planned future release** (see §8). No nutrition tables now. |
| D-A3 UI-first? | Admin styling | shadcn defaults for v1 (Hatem may restyle later) — pending his veto |
| D-A5 Video provider | Bunny vs Mux | decided at A4, rec Bunny |
| D-A6 Domain | admin.unlimited-sw.com | implied by D-A1; needs one DNS record at Cloudflare |

## 8. Future release — Nutrition (v1.x, planned, not scheduled)

When it becomes real, in this order: design tables together (proposal: `nutrition_plans` → `nutrition_days` → `nutrition_meals`, mirroring the training plan tree; assigned via enrollment like training plans) → migration (Hatem may write it as homework) → admin builder screen (mirror of the plan builder) → app screens (flow map already has "Nutrition Plan" + "Nutrition Details"). Marketplace-seam rule applies: meals belong to *a* coach.
