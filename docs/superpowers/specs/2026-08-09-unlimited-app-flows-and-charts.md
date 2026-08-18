# Unlimited coach app — the visual companion

Every important structure and flow of v1, drawn. Reads together with the database design doc (same date). Boxes = things or steps; diamonds = decisions; the crow's-foot fork in ERDs = "many".

---

## 1. The big system map

Who talks to what. The app sells nothing in-app; money enters only through the website.

```mermaid
flowchart TD
  A[Athlete] --> APP[Flutter app<br/>iOS · Android · web]
  C[Head coach / admin] --> APP
  APP <--> SB[(Supabase<br/>auth · data · realtime · storage)]
  APP --> VID[Video streaming<br/>short-lived signed links]
  WEB[Website checkout<br/>existing Next.js site] --> PM[Paymob]
  PM -->|webhook: payment confirmed| EF[Edge functions]
  EF --> SB
  EF --> FCM[Push · FCM]
  FCM --> APP
```

## 2. The core spine (ERD)

The chain the whole business hangs on: a human can be a coach; coaches own programs and build plans; paid orders unlock enrollments; enrollments carry the assessment, the assigned plan, and (later) the review.

```mermaid
erDiagram
  PROFILES ||--o| COACHES : "can be"
  COACHES ||--o{ PROGRAMS : owns
  COACHES ||--o{ PLANS : builds
  PROFILES ||--o{ ORDERS : places
  PROGRAMS ||--o{ ORDERS : "sold as"
  ORDERS ||--o| ENROLLMENTS : unlocks
  PLANS |o--o{ ENROLLMENTS : fulfills
  ENROLLMENTS ||--o| ASSESSMENT_SUBMISSIONS : "assessed via"
  ENROLLMENTS ||--o| REVIEWS : "rated by"
```

## 3. The money journey — end to end

From "I want this program" to "my access expired". This is the single most important chart in the company.

```mermaid
flowchart TD
  S[Athlete opens website shop] --> M{Payment method?}
  M -->|Card / Apple Pay| P[Paymob processes payment]
  P -->|webhook| PAID[Order: paid]
  M -->|InstaPay| U[Athlete uploads screenshot]
  U --> R{Admin reviews screenshot}
  R -->|approve| PAID
  R -->|reject with reason| RJ[Order: rejected<br/>athlete notified]
  RJ -->|re-upload| U
  PAID --> E[Enrollment created<br/>awaiting_assessment]
  E --> Q[Athlete fills assessment<br/>in the app]
  Q --> W[Enrollment: awaiting_coach]
  W --> CO{Coach reviews}
  CO -->|assign plan| ACT[Enrollment: active<br/>starts_at = now<br/>ends_at = now + duration_days]
  ACT --> X[Expiry job locks access<br/>at ends_at → expired]
```

## 4. Order lifecycle (status machine)

Every order is always in exactly one of these states — no other transitions exist.

```mermaid
stateDiagram-v2
  [*] --> pending : checkout started
  pending --> paid : Paymob webhook
  pending --> awaiting_review : InstaPay screenshot uploaded
  awaiting_review --> paid : admin approves
  awaiting_review --> rejected : admin rejects + reason
  rejected --> awaiting_review : athlete re-uploads
  paid --> refunded : refund issued
```

## 5. Enrollment lifecycle (status machine)

The membership card's life. The clock stamps happen exactly once, at coach approval.

```mermaid
stateDiagram-v2
  [*] --> awaiting_assessment : order paid
  awaiting_assessment --> awaiting_coach : assessment submitted
  awaiting_coach --> active : coach assigns plan — clock stamps
  active --> expired : ends_at passes
  active --> refunded : refund issued
```

## 6. Assessment flow

Questions come from the database (coach edits them without app updates); answers flow back as text or private media.

```mermaid
flowchart LR
  A[Program's questions load] --> B[Athlete answers<br/>text · number · choice · photo · video]
  B --> C[Draft — finish anytime]
  C --> D[Submit]
  D --> E[Coach reviews answers]
  E --> F[Coach assigns plan<br/>template · custom · pre-test]
```

## 7. Chat — how a message travels live

The phone subscribes to its conversation; new rows arrive pushed, never polled.

```mermaid
sequenceDiagram
  participant A as Athlete's app
  participant S as Supabase realtime
  participant C as Coach's app
  A->>S: insert message row
  S-->>C: row pushed instantly
  C->>S: set read_at on the row
  S-->>A: read receipt appears
```

## 8. Community moderation (store-mandated)

```mermaid
flowchart TD
  R[User taps Report] --> T[reports row: open]
  T --> Q[Admin moderation queue]
  Q -->|remove content| AC[Content soft-deleted<br/>report: actioned]
  Q -->|ban author| BAN[Profile: banned]
  Q -->|content is fine| D[Report: dismissed]
  B2[User taps Block] --> H2[Both users hidden<br/>from each other everywhere]
```

## 9. Competition lifecycle

```mermaid
stateDiagram-v2
  [*] --> draft : admin creates
  draft --> published : admin publishes
  published --> registration_closed : closes_at reached or capacity full
  registration_closed --> finished : event done
  finished --> [*] : results announced via community posts
```

## 10. Notification pipeline

Every notification exists twice — a row (the in-app list) and, if the user hasn't muted that type, a push.

```mermaid
flowchart LR
  EV[Event happens<br/>plan assigned · message · like · expiry soon] --> N[notifications row]
  EV --> P{User muted this type?}
  P -->|no| F[FCM push to all device_tokens]
  P -->|yes| SKIP[No push — row only]
  N --> LIST[In-app notification list<br/>rendered in user's language]
```

## 11. The expiry job (the 6pm lock)

A scheduled job — no human involved, runs every hour.

```mermaid
flowchart LR
  CR[Scheduled job<br/>every hour] --> W1[Find active enrollments<br/>with ends_at ≤ 3 days away]
  W1 --> RM[Send expiry-soon reminder<br/>once]
  CR --> FND[Find active enrollments<br/>with ends_at in the past]
  FND --> EXP[Flip status → expired]
  EXP --> NT[Notify athlete —<br/>renew on the website]
```
