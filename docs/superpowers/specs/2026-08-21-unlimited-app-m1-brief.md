# Unlimited app — M1 Foundation Brief

**Date:** 21 Aug 2026 · **Milestone:** M1 (`0.1.0`) from the [master plan](./2026-08-20-unlimited-app-implementation-plan.md)
**Division of labor (Hatem's call):** **Part A — Hatem builds the database himself.** Part B — Flutter/backend file plan awaiting his approval before any code.
**M1 exit demo:** sign up on a real iPhone in Arabic, see your profile, receive one test push.

---

# Part A — You build the database (step-by-step)

You'll create the Supabase project and apply all 13 migrations yourself, one at a time, understanding each. Nothing here needs me — but send me the **project ref** at the end.

## A1. Create the project (~10 min)
1. [supabase.com](https://supabase.com) → sign in → **New project**.
2. Organization: create one (e.g. `unlimited`), plan: **Pro ($25/mo)** is the right call from day one (daily backups, no auto-pausing — a paused free project would kill the expiry cron and webhooks).
3. Name: `unlimited` · **Region: `eu-central-1` (Frankfurt)** — the closest stable region to Egypt.
4. Database password: generate, store in your password manager. You'll rarely type it.
5. When it finishes, the dashboard URL looks like `https://supabase.com/dashboard/project/abcdefghijklmnop` — that last part is the **project ref**. Send it to me.

## A2. Two ways to apply the migrations — pick one

**Way 1 — SQL Editor (recommended for you, zero installs, you read every line):**
Dashboard → **SQL Editor** → New query → open each migration file from `Unlimited_app/unlimited/supabase/migrations/` on your Mac, paste its contents, read it, press **Run**. Go strictly in filename order (0100 → 1300). Green "Success. No rows returned" = done; move to the next.

**Way 2 — CLI (what a CI pipeline will use later):**
```bash
brew install supabase/tap/supabase
```
```bash
cd /Users/hatemrihan/Desktop/Unlimited-Main/Unlimited_app/unlimited && supabase login
```
```bash
cd /Users/hatemrihan/Desktop/Unlimited-Main/Unlimited_app/unlimited && supabase link --project-ref <YOUR_PROJECT_REF>
```
```bash
cd /Users/hatemrihan/Desktop/Unlimited-Main/Unlimited_app/unlimited && supabase db push
```
My suggestion: do Way 1 now (you learn every table), and we wire Way 2 into CI later so the two never drift.

## A3. What each migration is, in one line — and how to verify it
After each Run, verify in **Table Editor** (left sidebar) or the listed check.

| # | File | What it builds | Verify after running |
|---|---|---|---|
| 0100 | `extensions_and_enums` | pg_cron + all 16 fixed lists (roles, statuses, `currency`, `program_level`…) | SQL Editor: `select typname from pg_type where typtype='e';` → 16 rows |
| 0200 | `identity` | `profiles`, `coaches`, auto-profile-on-signup, **your split-guard trigger** | Table Editor shows both tables |
| 0300 | `training_content` | `video_categories`, `videos`, `programs` (with your new columns), `plans` → weeks → days → exercises | open `programs` → confirm `slug`, `level`, `price_sar`, `max_active_athletes` columns exist |
| 0400 | `orders_enrollments` | `orders` (amount+currency+split snapshot), `enrollments` (+`extended_days`), functions `mark_order_paid`, `reject_order`, `assign_plan_to_enrollment`, **`extend_enrollment`** | Database → Functions: all 4 listed |
| 0500 | `assessments` | questions / submissions / answers | tables exist |
| 0600 | `chat` | `conversations`, `messages` (+ Realtime) | tables exist |
| 0700 | `community` | posts, media, comments, likes, reports, blocks | tables exist |
| 0800 | `competitions` | competitions + registrations | tables exist |
| 0900 | `reviews` | verified-buyer reviews | table exists |
| 1000 | `notifications` | notifications, device_tokens, preferences | tables exist |
| 1100 | `platform_ops` | `app_settings`, `audit_log` | insert your InstaPay number into `app_settings` via Table Editor — your first hand edit |
| 1200 | `scheduled_jobs` | `expire_enrollments()` + hourly pg_cron schedule | SQL Editor: `select jobname from cron.job;` → 1 row |
| 1300 | `storage_buckets` | 5 buckets (2 private) | Storage sidebar shows 5 buckets |

**Order matters** — some functions reference tables from later files (safe: Postgres resolves names when a function *runs*, not when it's created), but tables reference earlier tables, so never skip ahead.

## A4. After the last migration (~10 min, dashboard, no code)
1. **Auth providers:** Authentication → Providers → enable **Email**. (Google and Apple need app credentials — that's an M1 dev task with me; leave them off today.)
2. **Health check:** Advisors (left sidebar) → run Security advisor → expect no "RLS disabled" errors. Screenshot me anything red.
3. **Try your powers:** Table Editor → `app_settings` → add `support_whatsapp`. That's §16 of the design doc in action — this is your direct-edit surface.
4. Send me: **project ref** + the **anon key** *only* (Settings → API). ⚠️ Never paste the `service_role` key in chat, to me, or anywhere outside the backend's `.env` — it bypasses every security rule.

---

# Part B — Flutter + backend plan (approve before I code)

## B1. Decisions to confirm (D2/D3 from the master plan)
- **D2 State management + routing: Riverpod + go_router.** Most-documented, boring-in-the-good-way pair; deep-link support we need for push taps.
- **D3 Backend host: Fly.io** (Frankfurt region, matches the DB; ~$3–5/mo for this tiny service).

Say "B approved" (or veto) and these lock.

## B2. Flutter dependencies (added to `pubspec.yaml`, latest stable at install time)
`supabase_flutter` (auth+DB+realtime) · `flutter_riverpod` · `go_router` · `intl` + `flutter_localizations` (EN/AR, RTL) · `firebase_core` + `firebase_messaging` (push) · `cached_network_image` · `flutter_secure_storage` (session) · `google_sign_in` + `sign_in_with_apple` (M1 wires email first, these land with provider setup).
Dev: `flutter_lints`, `mocktail`.

## B3. Folder tree (mirrors the database domains — your naming rule)
```
lib/
  main.dart                  # boot: Supabase init, Firebase init, runApp
  app/
    router.dart              # go_router: all routes + auth redirect
    theme.dart               # light + dark
    l10n/                    # app_en.arb, app_ar.arb (EN/AR strings)
  core/
    supabase.dart            # the one Supabase client
    result.dart              # error-or-value helper
    widgets/                 # shared buttons, fields, loading, empty states
  features/
    auth/                    # M1: sign in/up/out screens + controller
    profile/                 # M1: view + edit my profile
    programs/                # M2+ (folder exists, empty)
    enrollments/             # M2+
    assessments/             # M3
    chat/                    # M4
    community/               # M5
    competitions/            # M5
    notifications/           # M1: device-token registration + list screen
```
Each feature folder: `data/` (queries to Supabase) · `logic/` (Riverpod controllers) · `ui/` (screens/widgets). Same three names everywhere.

## B4. M1 build order (each step compiles + runs)
1. `core/supabase.dart` + boot — app starts, connects (uses your anon key).
2. Theme + l10n scaffolding — RTL flips correctly on `ar`.
3. Auth: email sign-up/in/out; profile row auto-appears (your 0200 trigger).
4. Profile screen: read + edit `display_name`, `username`, `bio`, `language`.
5. Push: Firebase project (I'll set up, you own the account), `device_tokens` registration, backend `/webhooks/notification-created` deployed to Fly.io, Supabase Database Webhook pointed at it → test push to your phone.
6. CI: GitHub Actions — `flutter analyze` + `flutter test` + `pytest backend/` on every push.

## B5. What M1 needs from you besides Part A
- Apple Developer account ($99/yr) — needed for Sign in with Apple + TestFlight later; start the enrollment now, Apple can take days.
- A Firebase project (free) — I'll walk you through creating it when we hit step 5, or you add me as a member.

---

**Sequence from here:** you do Part A (any day, ~1–2 hours) → send project ref + anon key → you say "B approved" → I start B4 step 1, showing you each file as it's written per your rule.
