# Unlimited app — Master Implementation Plan

**Date:** 20 Aug 2026 · **Status:** for Hatem's review — nothing starts until approved
**App:** "unlimited" (Flutter + Supabase + Python/FastAPI backend) at `Unlimited_app/unlimited/`
**Companions:** [Database design](./2026-08-09-unlimited-app-database-design.md) · [Flows & charts](./2026-08-09-unlimited-app-flows-and-charts.md)

---

## 0. Where we actually are (verified 20 Aug)

| Layer | State | Evidence |
|---|---|---|
| Product decisions | ✅ Locked (v1 = head coach only; checkout on website; manual settlement; EN/AR from birth; Netflix-model, 0% Apple/Google) | database design §0 |
| Database design doc | ⚠️ Written, **still marked "draft for Hatem's review"** — names not yet approved | doc header |
| Flows doc | ✅ 11 diagrams (money journey, status machines, chat, moderation, expiry job) | flows doc |
| SQL migrations | ⚠️ 13 files, 1,213 lines, covering all 12 domains — **written but never applied to any Supabase project** | `supabase/migrations/` |
| Python backend | ⚠️ Skeleton: FastAPI + Paymob webhook (HMAC verify) + FCM push relay, 282 lines — **not deployed, no tests** | `backend/` |
| Flutter app | ❌ Untouched default counter app; zero dependencies added | `lib/main.dart`, `pubspec.yaml` |
| Web side (`/programs` shop + Supabase admin inside unlimited-sw) | ❌ Not started | — |
| Supabase project | ❌ None created (or not connected) | no config in repo |

**The single blocking item is your review of the database design.** Everything downstream (migrations, backend, app screens) is named after those tables. Review it once, veto names, and the whole chain unblocks — changing a table name later costs 10× more.

---

## 1. The shape of the plan

We build **vertical slices, money-first**: each milestone delivers one complete journey a real user can perform, end to end, on a phone. No horizontal layers ("all UI, then all backend") — those hide integration bugs until the end.

Order of journeys = order of business risk:
1. Money must flow (web checkout → order → enrollment) — riskiest, most external parties (Paymob), do first.
2. Coach must deliver (assessment → approve → program unlock → expiry) — the product itself.
3. Retention features (chat, community, competitions) — valuable but the app survives their delay.

Version ladder (semver, locked earlier): `0.1.0` foundation → each milestone bumps minor → **`1.0.0` = store launch**. Marketplace (external coaches) stays v2.0.0; the schema already keeps its seam.

---

## 2. Milestones

### M0 — Approval gate (you, ~2 hours)
Read the database design doc; approve or rename tables/columns/enums (§15 lists my defaults to veto). Approve the split of the doc into one file per domain (identity, training, money, assessments, chat, community, competitions, reviews, notifications, ops) — names yours.
**Exit:** doc status flips from draft to approved; this plan's names become final.

### M1 — Foundation (`0.1.0`) · ~1 week
**Goal: a real app skeleton that signs in, in both languages, on both platforms.**
- Create the Supabase project (region: `eu-central` — closest stable region to Egypt); apply all 13 migrations; verify RLS with the Supabase advisors.
- Flutter foundations, in this order: folder structure (`lib/features/<domain>/…` mirroring the DB domains — names to approve), state management + router choice (**proposal: Riverpod + go_router** — the boring, best-documented pair), theme (light/dark), `intl` EN/AR with full RTL, `supabase_flutter` auth (email + Google + Apple), profile screen writing to `profiles`.
- Deploy the Python backend (Railway or Fly.io — decision M1) with health check; wire Supabase Database Webhook → `/webhooks/notification-created` → FCM (test push to a real device).
- CI: GitHub repo, `flutter analyze + test` and `pytest` on every push.
**Exit demo:** you sign up on your iPhone in Arabic, see your profile, receive one test push.

### M2 — Money (`0.2.0`) · ~2 weeks · **the make-or-break milestone**
**Goal: a stranger can pay on the website and the app knows.**
- Website (`unlimited-sw` repo, per your locked decision): add `supabase-js` client; `/programs` listing + `/programs/[slug]` + checkout page (Paymob card/Apple Pay + InstaPay screenshot upload) writing `orders` to Supabase. Mongo untouched.
- Backend: Paymob webhook → `mark_order_paid()` SQL function (already designed) — order flips to `paid`, `enrollments` row created as `awaiting_assessment`.
- Admin (web, inside existing `/admin`): InstaPay screenshot review queue → approve/reject.
- App: "My programs" tab shows the enrollment and its status, live via Realtime.
**Exit demo:** test card payment on the website → push notification lands on your phone → enrollment visible in-app. InstaPay flow same, with manual approval.

### M3 — Coach delivery (`0.3.0`) · ~2–3 weeks
**Goal: the full product loop — assess, assign, train, expire.**
- Assessment: program-specific question sets (text/number/choice/photo/video answers, uploads to storage buckets), athlete fills after payment.
- Coach dashboard (Flutter web + phone): review submission → assign ready-template plan or build custom (weeks → days → exercises composed from the video library) → approve; `starts_at = approval`, `ends_at = starts_at + duration_days` (the locked clock rule).
- Video library: 500+ videos, categorized; storage on a streaming service (**decision M3: Bunny Stream vs Mux — Bunny is ~10× cheaper for MENA traffic, my rec**) with short-lived signed URLs.
- Athlete: program player screen (day view, video playback, mark-done), locked/expired states; scheduled expiry job (already designed as SQL + cron).
**Exit demo:** the head coach onboards a real paying athlete end to end without touching a database.

### M4 — Chat (`0.4.0`) · ~1 week
Coach ↔ athlete 1:1 conversations (Supabase Realtime), unread badges, image attachments, push on new message, mute. **Exit:** two phones, live conversation.

### M5 — Community + competitions (`0.5.0`) · ~2 weeks
Twitter-style feed (posts, media, comments, likes), role badges, and the store-mandated moderation set: report, block, admin remove (Apple rejects UGC apps without all three). Competitions v1: admin announces, athletes register in-app, results as community posts. **Exit:** feed usable, a report reaches the admin queue.

### M6 — Reviews, polish, store readiness (`0.9.0`) · ~2 weeks
Verified-buyer reviews on programs; notification preferences screen; account deletion (store requirement, personal-data hard delete already designed); onboarding screens; empty/error/offline states pass; App Store + Play Store assets, privacy labels, demo-review account; TestFlight + internal testing track with ~10 real athletes for 2 weeks.

### M7 — Launch (`1.0.0`)
Store submission, launch announcement through the community + the unlimited-sw site, crash monitoring (Sentry), analytics events for the money funnel.

**Total: roughly 11–13 working weeks** of build time after M0 — realistic for one developer + you reviewing; parallelize the website work (M2) with a second person to cut ~2 weeks.

---

## 3. Standing decisions this plan inherits (no re-litigating)
- Backend logic = **Python/FastAPI** service; DB logic = SQL functions in Supabase. Never TypeScript backend for this project.
- App sells **nothing** in-app; programs bought on the website only.
- Web additions live **inside unlimited-sw** (supabase-js beside Mongo); store migrates to Supabase later, page by page.
- Timestamps UTC in DB, device-local display.
- Every user-facing text field stored `_en`/`_ar`.
- Docs-first, one deliverable per step, you approve every file/function name before code.

## 4. Decisions needed from you (only these, each at its milestone)
| # | Decision | When | My recommendation |
|---|---|---|---|
| D1 | Approve/rename DB tables & enums, and per-domain doc split | **M0 — now** | defaults in design doc §15 |
| D2 | Flutter state mgmt + router | M1 | Riverpod + go_router |
| D3 | Backend host | M1 | Fly.io (Cairo-adjacent regions, cheap) |
| D4 | Video streaming provider | M3 | Bunny Stream |
| D5 | Coach/admin dashboard: Flutter web only, or also shadcn pages in unlimited-sw `/admin` | M2/M3 | start Flutter web (one codebase), revisit if clunky |
| D6 | Beta testers list (~10 athletes) | M6 | coach's current athletes |

## 5. Risks to keep in view
- **Paymob webhook reliability** — build the InstaPay-style manual "mark paid" admin action as the fallback from day one (M2 includes it).
- **Apple review** — UGC moderation (M5) and account deletion (M6) are rejection traps; both are already in scope, don't cut them to ship faster.
- **Video cost** — 500 videos × streaming: Bunny keeps this ~$10–30/mo at early scale; raw Supabase storage streaming would be slower and pricier. Signed URLs stop link sharing.
- **Two repos, one feature** (M2 spans app + website) — every M2 PR states which repo and gets its own acceptance check, same style as the SEO briefs.
- **Solo-dev bus factor** — CI + migrations-as-files (already true) + this doc keep the project restartable.

## 6. Immediate next actions
1. **You:** M0 review of the database design doc (§15 defaults especially). Reply with renames or "approved".
2. **Then me:** split the design doc into per-domain files (names you chose), write the M1 detailed brief (exact folder tree, file names, pubspec dependencies with versions) for approval — same format as the SEO Phase 1 brief.
3. **You (parallel, 30 min):** create the Supabase org + project (I can't create billing-bearing resources), send me the project ref; create the Paymob test account if not existing.
