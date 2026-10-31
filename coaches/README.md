# coaches — public coach pages

**What this folder is:** the store's window into the coaching platform. It
reads verified coaches out of Supabase and renders them at
`/coaches/<handle>` and `/ar/coaches/<handle>`.

It is the only part of this shop that touches a database it does not own.

---

## Why a coach page lives on the shop

A coach profile exists to be *found*. Searched for by name, sent in a
WhatsApp message, linked from an Instagram bio, printed on a card. None of
that works inside a phone app, and a fresh domain would start from nothing.
`unlimited-sw.com` has been indexed for years, so the profile is served
from here.

The coaching platform still owns the facts. This folder only asks for them.

---

## The four files

| File | What it does |
| --- | --- |
| `supabase.ts` | The one connection. Read-only, publishable key, built on first use. |
| `schema.ts` | The shape of a public coach — and `PROFILE_FIELDS`, the parity contract. |
| `api.ts` | Two reads: one coach by handle, and every handle for the sitemap. |
| `seo.ts` | Addresses, `<head>`, and the Person/ProfilePage structured data. |
| `certifications.ts` | Courses (19 Oct 2026): the Certified badges from the view `public_certifications`, and the verdict for `/verify/<code>` from the door `verify_certificate_v1`. Reads only. |

The page itself lives in `app/components/coach-profile/` (redesigned
30 Oct 2026 from two pictures Hatem picked), with a thin route file per
language:

| File | What it does |
| --- | --- |
| `CoachProfile.tsx` | The page: the two parts below, the JSON-LD, nav and footer. Plain text, no tabs, no cards, no boxes (Hatem, 30 Oct). |
| `ProfileHeader.tsx` | Short cover, photo, taking-athletes line, name, tick, headline, two text links (talk to us · share). |
| `ProfilePanels.tsx` | Every section as text, one under the other: About (bio, rating, followers), Plans (name, length · level · price, description, cover), Certificates, Download app. |
| `ShareChip.tsx` | Share sheet on a phone, copy link elsewhere. |
| `CoachPageError.tsx` | What shows when the platform cannot be read (used by each route's `error.tsx`). |
| `CoachProfile.module.css` | No colours — stone and grey; the calm type scale (nothing above 19 px), the tab bar's shape, motion. |

**"Download app"** goes nowhere and reads "Soon" until
`NEXT_PUBLIC_APP_DOWNLOAD_URL` is set on Vercel (`coaches/posts.ts`).

**When the platform cannot be read**, `api.ts` throws instead of answering
"no such coach". A cached page keeps serving its last good copy; a first
visit shows "The coach page could not be loaded" with Try again. Before
30 Oct a failed read became a 404 that the CDN kept for an hour.

### The certificate pages (courses, 19 Oct 2026)

`/verify/<code>` (and `/ar/verify/<code>`) is what the QR on an Unlimited
certificate opens: one verdict — valid, expired, revoked, unknown — in one
colour, then the facts printed on the paper so a stranger can compare them
line by line. It is **never cached** (`force-dynamic`: a certificate
revoked a minute ago reads "revoked" now) and **never indexed** (a verify
page is for the person holding the QR). Any failure is "unknown", never a
system error — the reader is not our operator. `/verify?code=…` is the
typed form and redirects to the same URL shape. `/download` is where the
desktop installers will be listed (`DESKTOP_BUILDS` in
`app/components/DesktopDownload.tsx`); until then it says so.

---

## The rule that governs this folder

> **"What he sees in web, he sees also in mobile."** — Hatem, 30 Aug 2026

A coach profile is one thing with two renderers. The web one is
`app/components/coach-profile/`; the mobile one is
`Unlimited_app/unlimited/lib/features/coaches/ui/coach_profile_screen.dart`.

The facts both must show are listed in `schema.ts` as `PROFILE_FIELDS`. A
new fact lands in the database first, then in **both** renderers in the
same piece of work. A field on one surface and not the other is a bug, not
a "for now".

The two pages *look* different, and that is not a parity failure. The app
has tabs because a signed-in athlete has business there — their coach's
roster, their own chat. This page is for a stranger arriving from Google,
who has none. Same facts, different furniture.

---

## What this store cannot do, structurally

**It writes only through named doors.** This section used to say the store
could not write at all. That was true while this folder only read coach
profiles, and coach applications ended it — `apply_to_coach` and
`confirm_application` are writes. The rule is corrected rather than quietly
outgrown, because a rule everybody knows is broken protects nothing:

> The store may call a **named door**. It may not touch a table, and it may
> never hold a key that could.

A door is a `security definer` function the platform wrote, which validates
its own arguments and decides for itself what it will do. `apply_to_coach`
can create an unconfirmed application and nothing else — it cannot read one
back, cannot see who else applied, and cannot reach the interview table.
There is no service key in this repository and there must never be one; a
feature the doors do not allow gets another door, not a stronger key.

**It cannot sign anyone in.** No follow button, no message button, no
review composer: every one of them needs a signed-in athlete, and the store
holds no Supabase session. That is why the call to action is "talk to us"
rather than a button that opens a login the store cannot perform.

**It cannot sell a programme.** Programmes are bought in the app. The cards
on this page are priced and deliberately not links.

---

## Why there is no `status = 'active'` filter anywhere in here

You would expect one. Its absence is deliberate and is explained at length
at the top of `api.ts`. Short version: the platform's own row security
already hides unverified coaches from this key (`verified coaches are
readable`, migration `20260830000300`). Repeating the rule here would teach
the next person that the *store* enforces it. It does not. One rule, one
place.

An unverified coach, a suspended one, a handle that belongs to an athlete,
and a handle that does not exist all produce the same thing: **404**. A
"this coach is pending approval" page would tell the world that somebody
applied.

---

## Environment

Two values, both public, in `.env.local` and in Netlify:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Missing them throws loudly rather than serving an empty coach list that
looks like "no coaches yet". The sitemap catches that separately, so a
preview deploy without the vars still lists every product.

---

## Where the data comes from

`public_coaches` — a view created by migration `20260830000400` in the app
repo. Verified coaches only, with the rating and follower count already
folded in. The mobile app reads the same view, which is how parity is kept
by construction rather than by two people remembering the same list.

That migration also closed a real hole: `public_profiles` was readable by
the anonymous internet, which meant the whole user directory. If you are
ever tempted to create a `security definer` view, read that migration
first — **the GRANT list is the entire security model**, and Supabase
grants `anon` SELECT by default.
