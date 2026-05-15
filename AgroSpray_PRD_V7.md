# AgroSpray Drone Service Platform
## Product Requirements Document

**Version 7.0**
Two-sided marketplace for agricultural drone spraying — India
Telegram + Progressive Web App · Multi-tenant from day one
**Date:** 14 May 2025
**Status:** Approved for V1 build

---

## Table of contents

1. Executive summary
2. Product vision and goals
3. Target users and personas
4. Scope
5. Product architecture overview
6. Functional requirements
7. State machines
8. User journeys
9. Non-functional requirements
10. Technical architecture
11. Data model
12. Integration specifications
13. Compliance and legal requirements
14. Phase 2 scope
15. Risks and open questions
16. Success metrics
17. Glossary

---

## 1. Executive summary

AgroSpray is a two-sided marketplace platform that connects Indian farmers with agricultural drone-spray service providers. Farmers book spray jobs through a conversational Telegram bot in their preferred language. Service providers operate the platform through an installable Progressive Web App that handles operations, fleet management, compliance, and billing.

The platform addresses three core problems in the current agri-drone services market. First, farmer access is fragmented — most service providers operate by phone and WhatsApp with no structured booking. Second, anti-fraud is weak — pilots can claim work they did not perform because evidence chains rely on self-reported photos. Third, compliance is informal — DGCA, DigitalSky, and CIB regulations are inconsistently enforced at the operator level, exposing service providers to legal risk.

V1 launches with a single-supplier configuration. The platform is multi-tenant from day one to support a Phase 2 aggregator model where multiple suppliers operate on shared infrastructure. The core anti-fraud signal is drone telemetry pulled directly from the manufacturer's API (DJI FlightHub, XAG, Garuda) — the pilot's photo and GPS are corroborative, not authoritative. Compliance checks (DGCA UIN and RPC validity, NPNT pre-flight, CIB pesticide approval) gate booking confirmation and per-sortie takeoff.

The platform is operational with one supplier, three to five pilots, four drones, and a peak load of approximately 200 jobs per week. Phase 2 expands this to multi-supplier aggregation, automated UPI payments, lead generation analytics, and SMS or IVR fallback for Telegram outages.

---

## 2. Product vision and goals

### 2.1 Vision

To become the operational backbone for agricultural drone services in India: the booking platform farmers trust, the compliance layer regulators recognize, and the operations system service providers build their business on.

### 2.2 Strategic goals

- Reduce booking friction for farmers from multiple phone calls to a single Telegram conversation, supporting Hindi, English, and Marathi at launch.
- Replace self-reported job-completion evidence with drone telemetry as the source of truth, making fraud detectable rather than litigated.
- Enforce DGCA, DigitalSky, and CIB compliance as a platform property, not an operator habit.
- Enable a single supplier to manage their full operation through one Progressive Web App, installable on phone or laptop.
- Build the data model and tenancy boundaries that allow Phase 2 expansion to a multi-supplier aggregator without a schema rewrite.

### 2.3 Non-goals for V1

- No payments automation — UPI QR generation only, payment confirmation is manual.
- No multi-supplier aggregation — single tenant launch, multi-tenant data model.
- No insurance integration or automated incident claims.
- No farmer-to-supplier ratings.
- No SMS or IVR fallback channel.

---

## 3. Target users and personas

### 3.1 Farmer

**Primary characteristics:** Smallholder or commercial farmer in India, owns or leases 1 to 50 acres, grows wheat, cotton, soybean, sugarcane, paddy, or vegetables. Comfortable with Telegram on smartphone but prefers voice messages over typing in Devanagari or other Indian scripts. May have intermittent rural connectivity. Spoken language is typically Hindi, Marathi, or English (often code-switched as Hinglish).

**Goals:** Book a drone spray for a specific crop and field, on a specific date, at a known price. Receive timely confirmations and reminders. Pay easily via UPI. Have recourse if the spray quality is poor.

**Pain points:** Existing booking is by phone — multiple calls, no written record. Pricing varies opaquely. No proof the spray happened as promised. Cannot easily reschedule when weather changes.

**Primary channel:** Telegram bot (Farmer bot). The PWA is not exposed to farmers.

### 3.2 Pilot

**Primary characteristics:** Trained drone pilot holding a DGCA Remote Pilot Certificate (RPC). Works for one supplier. Operates one or two drone models. Spends most of the day in the field. Typically owns a smartphone with mid-range specs. Comfortable with Telegram; PWA optional for V1.

**Goals:** Receive job assignments clearly. Complete pre-flight checks without paperwork. Capture proof of work without manual effort. Know when the next job is.

**Pain points:** Manual logging is error-prone. Disputes about whether the job was done are hard to resolve. NPNT permission paperwork is friction.

**Primary channel:** Telegram bot (Pilot bot). Drone telemetry is the source of truth — the pilot's role becomes confirming intent (start, finish) rather than producing evidence.

### 3.3 Supplier admin

**Primary characteristics:** Owner-operator or operations manager at a drone-spray service provider. Manages 2 to 10 pilots, 2 to 8 drones, and a service area covering several districts. Comfortable with desktop and mobile web. Needs to track jobs, slots, finances, compliance, and crew.

**Goals:** Run daily operations without paper. Assign pilots and drones to jobs. Track compliance proactively. Invoice with correct GST. Override the system when the situation demands it. Avoid double-booking and missed jobs.

**Pain points:** Current state is spreadsheets and WhatsApp groups. Hard to enforce compliance, hard to track which drone has which job, hard to know if revenue is being captured.

**Primary channel:** Admin PWA — installable on phone for field use and laptop for office. Full control over all entities and operations with audit-trailed override on every automated decision.

### 3.4 Support agent

**Primary characteristics:** Customer support staff at the supplier or platform aggregator. Handles escalations when the bot cannot interpret a farmer's message, when a job is disputed, or when an incident is reported.

**Goals:** See the full conversation history. Take over a Telegram conversation when the NLP engine confidence is low. Resolve disputes with audit evidence. Escalate incidents to regulators if required.

**Pain points:** Without an audit log, disputes are unwinnable. Without conversation history, they have to ask the farmer to repeat their problem.

**Primary channel:** Support PWA — same shell as Admin PWA, scoped to support tasks.

---

## 4. Scope

### 4.1 In scope for V1

- Farmer-facing Telegram bot supporting Hindi, English, and Marathi, with voice note transcription.
- Pilot-facing Telegram bot for job lifecycle confirmation.
- Admin PWA covering full supplier operations, installable on iOS and Android, working offline.
- Support PWA scoped to human handoff and dispute resolution.
- Multi-tenant data model with single-supplier launch tenant.
- Booking flow with concurrency-safe slot allocation.
- Wishlist queue with first-confirm-wins resolution.
- Job state machine with formal states and guards.
- Multi-sortie job tracking — a job may decompose into multiple drone flights.
- Drone fleet management — UIN, RPC binding, service hours, insurance, calibration, battery cycles.
- Drone telemetry ingestion from manufacturer APIs (DJI FlightHub initial; XAG and Garuda follow).
- DGCA compliance: UIN and RPC validity checked before job confirmation; NPNT permission requested before each sortie.
- CIB pesticide compliance check before job confirmation.
- Pricing engine with per-acre or per-sortie base rate, travel surcharge, chemical-included differential, cancellation tiers.
- GST classification per invoice line item (SAC 9986 for drone service; chemicals taxed separately).
- UPI QR code generation for payment collection. Payment confirmation is manual.
- Anti-fraud reconciliation based primarily on drone telemetry, with photo and GPS as corroboration.
- Immutable audit log with three event types: auto, manual, override.
- SLA monitor for stalled enquiries and overdue jobs.
- DPDP Act 2023 consent capture and right-to-delete handling.
- Supplier onboarding wizard with six steps.
- Full admin override capability with audited reason capture on every forced transition.
- Manual entity creation by admin (farmer, job, slot, drone, pilot, evidence).

### 4.2 Phase 2 (post-V1)

- Automated UPI payment confirmation and escrow.
- Lead generation analytics — seasonal demand, geographic clustering, customer retention.
- Multi-supplier aggregator with supplier rotation, lead distribution, and commission tracking.
- SMS and IVR fallback for Telegram outage or non-Telegram users.
- Insurance and incident claims integration.
- Pilot PWA (currently pilots use Telegram bot only).
- Multilingual admin dashboard (currently English only).
- Farmer-to-supplier ratings and reviews.

### 4.3 Out of scope — V1 and Phase 2

- Multi-day jobs spanning more than 24 hours.
- Parallel multi-drone operations on a single job (treated sequentially).
- Direct sale of agrochemicals through the platform.
- Equipment financing or leasing.
- Weather forecasting beyond display of a third-party feed.
- Marketing and farmer acquisition channels — handled by the supplier offline.

---

## 5. Product architecture overview

The platform is organized into five logical layers. The interface layer exposes channels — Telegram bots for end users in the field and a Progressive Web App for operations staff. The platform layer contains 24 modules organized into 6 functional tiers. The storage layer provides multi-tenant persistence, object storage for media and telemetry, cache, and an async message queue. The supplier operations layer turns platform decisions into supplier-side actions. External integrations connect to Telegram, drone manufacturer APIs, government APIs, and payment rails.

### 5.1 Interface layer

| Channel | Description |
|---|---|
| Farmer bot | Telegram bot. Farmer's primary interface. Conversational, multilingual, voice-aware. |
| Pilot bot | Telegram bot. Pilot job lifecycle: receive assignments, confirm start, confirm finish, send corroborative photo and GPS. |
| Admin PWA | Progressive Web App. Installable on iOS, Android, desktop. Offline-capable via service worker. Full operations control. |
| Support PWA | Same PWA shell, scoped to support tasks. Used for human handoff when NLP confidence is low or disputes arise. |

### 5.2 Platform layer — module tiers

| Tier | Modules |
|---|---|
| Conversation | NLP Engine, Voice STT, Identity Service, Consent / DPDP |
| Booking | Booking Engine + State FSM, Slot Manager, Reschedule Engine, Wishlist Queue |
| Drone domain | Drone Fleet, Telemetry Ingestion, Sortie Tracker, Incident Tracker |
| Compliance + pricing | DGCA + NPNT, CIB Pesticide, Pricing + GST, Anti-fraud |
| Trust + ops | Audit Log, SLA Monitor, Notifications, Web Push |
| Admin + onboarding | Onboarding Wizard, Admin Override, Tenant Settings, Manual Create |

### 5.3 Supplier operations layer

Logistics, Crew Assignment, Invoice Engine, QR Payment. These are the operational concerns of the supplier, exposed through the Admin PWA and driven by platform state.

### 5.4 Storage and async

PostgreSQL as the primary data store with row-level locks for concurrency-critical operations (slot allocation, wishlist resolution). Tenant ID on every row. Object storage (S3-compatible) holds re-hosted Telegram media and drone telemetry blobs. Redis serves session state, rate limits, and cached lookups. IndexedDB on the client provides offline data for the PWA. A message queue handles asynchronous events between platform modules and ingests the drone telemetry stream.

### 5.5 External integrations

- Telegram Bot API — farmer and pilot conversation channel.
- Drone manufacturer APIs — DJI FlightHub at launch; XAG and Garuda in subsequent releases.
- DGCA DigitalSky API — UIN validation, RPC validation, NPNT permission requests.
- CIB pesticide registry — pesticide approval lookup by crop and application method.
- UPI — QR code generation for collection; merchant onboarding via aggregator (Razorpay, Cashfree, or Paytm).
- SMS gateway (Phase 2) — for outage fallback and OTP delivery.

---

## 6. Functional requirements

### 6.1 Interface — Farmer bot

**Channel:** Telegram. Identified by the supplier's bot token. In multi-tenant phase 2, suppliers may bring their own bot or opt into the shared platform bot.

**Conversation model:** Free-form natural language. The bot parses farmer intent via the NLP engine and collects five required fields: crop, area, date, location, spray type.

#### 6.1.1 Functional behaviors

- Accepts text messages in Hindi, English, Marathi (and code-switched Hinglish).
- Accepts voice notes — automatically transcribed via the Voice STT module.
- Accepts location pins shared from the farmer's phone.
- Accepts photo of the field with caption if the farmer prefers visual context.
- Detects returning farmers by Telegram ID. Prompts before reusing previous booking details rather than auto-filling.
- Detects when all five booking fields are collected. Triggers slot check.
- Surfaces 2–3 alternative dates when the requested slot is full, plus the wishlist option.
- Presents the job summary in the farmer's language for explicit confirmation.
- Issues the job number on confirmation, in format `AGR-{tenant}-{state}-{date}-{crop3}-{seq4}`.
- Hands off to the Support PWA when NLP confidence falls below threshold.
- Captures DPDP consent on first interaction with a clear summary of data usage.

#### 6.1.2 Non-behaviors

- Does not auto-fill fields from previous bookings without explicit farmer confirmation.
- Does not retain conversation context across more than 24 hours of inactivity — long-paused sessions restart.
- Does not display pricing until the supplier confirms the quote (pricing engine produces the quote, supplier approves).

### 6.2 Interface — Pilot bot

**Channel:** Telegram. Pilots are added by admin during onboarding or later via Tenant Settings. Each pilot has an internal Pilot ID; the Telegram ID is an authentication credential, not the identity.

#### 6.2.1 Functional behaviors

- Receives job assignments with farm location, crop, area, scheduled date, and assigned drone.
- Prompts the pilot through the pre-flight checklist before each sortie.
- Requests NPNT permission via DigitalSky on the pilot's behalf at the right time.
- Announces telemetry stream start (the drone API is the source) and end.
- Prompts for corroborative photo and GPS pin at the end of the job — supplementary, not gating.
- Notifies the pilot of upcoming jobs the day before.
- Allows the pilot to flag an incident inline (drone fault, weather abort, drift complaint, injury).

### 6.3 Interface — Admin PWA

**Channel:** Installable Progressive Web App. Authenticated via phone OTP plus password or OAuth. Multi-tenant aware — admin session is scoped to a tenant.

#### 6.3.1 Capabilities — must support

- First-time supplier onboarding via 6-step wizard.
- Live operational dashboard with compliance blocks, active jobs, slot manager, drone fleet, pilot roster.
- Per-row admin actions on every entity: View, Edit, Force state, Override, Cancel, Reassign.
- Manual create for every entity type: farmer, job, slot, drone, pilot, evidence, incident.
- Audit log view with filters by event type (auto, manual, override), actor, time range.
- Compliance dashboard showing all bookings blocked by DGCA, CIB, or pricing rules with one-click override (audited).
- Drone fleet view with live telemetry overlay on active jobs and a maintenance schedule.
- Tenant settings: business identity, Telegram bot config, pricing defaults, user roles, DPDP consent log.

#### 6.3.2 PWA shell requirements

- Web App Manifest with installable metadata, icons, and start URL.
- Service worker for offline shell loading and write queueing.
- IndexedDB for offline read access to active jobs, drones, pilots, and current slots.
- Web Push API integration for compliance alerts, SLA breaches, and dispute notifications.
- Responsive design: side nav at desktop breakpoint, bottom nav at mobile breakpoint.
- Auto-sync on reconnect with conflict resolution: server timestamp wins for entity edits.

### 6.4 Interface — Support PWA

Same shell as Admin PWA, role-scoped. Support agents can read full conversation history of any farmer (within tenant scope), take over an active Telegram session when handed off, view audit log relevant to the case, and log resolution notes.

### 6.5 Platform — Conversation tier

#### 6.5.1 NLP Engine

**Purpose:** Parse free-form farmer input into structured booking fields. Detect intent. Score confidence. Hand off to human support below threshold.

**Inputs:** Text or transcribed voice in Hindi, English, Marathi, or Hinglish.

**Outputs:** Extracted fields (crop, area, area-unit, date, location, spray type, preferred slot), per-field confidence score, overall intent classification.

**Functional requirements**

- Recognize at least 25 crops common in India by name in Hindi, English, and Marathi.
- Normalize Indian agricultural area units: acre, hectare, bigha (state-aware), guntha, kanal, ghumao. Bigha conversion table is maintained per state.
- Parse dates in DD/MM/YYYY, named days (Monday), relative phrases (kal, parson, agle hafte, agle mangalwar), and lunar references (Diwali ke baad, Eid ke pehle) using an Indian-calendar-aware date parser.
- Parse times including conversational forms: subah, dopahar, shaam, dhalti dhup.
- Extract location from text, shared location pins, or referenced landmarks.
- Score field-level extraction confidence on 0–1 scale. Aggregate intent confidence.
- Trigger human handoff when intent confidence falls below 0.6 or when the farmer types help-equivalent in any language.

#### 6.5.2 Voice STT

**Purpose:** Transcribe Telegram voice notes into text for the NLP engine.

**Constraints:** Multilingual including code-switched Hinglish. Robust against farm-background noise. Affordable per-request cost.

**Functional requirements**

- Accept Telegram voice note files (typically OGG Opus, 16 kHz).
- Transcribe and return text plus language label and transcription confidence.
- Support primary languages Hindi, English, Marathi at launch. Punjabi, Telugu, Tamil in subsequent releases.
- Cost target: under 0.50 INR per 30-second clip at projected volume.
- Fallback to support handoff if confidence is too low for NLP to consume.

#### 6.5.3 Identity Service

**Purpose:** Decouple actor identity from authentication channel. Pilots and admin users have internal IDs; Telegram ID and email are credentials, not identities.

**Functional requirements**

- Assign internal user ID at first authenticated interaction.
- Bind one or more credentials to a user ID: phone OTP, Telegram ID, email and password, OAuth.
- Allow credential rotation — pilot loses phone, new Telegram ID can be bound to same Pilot ID.
- Revoke credentials on user deactivation (pilot leaves company).
- Support tenant scope — a user ID is bound to one tenant in V1; Phase 2 supports multi-tenant membership.
- Enforce role-based access in the Admin PWA: Owner, Admin, Operations, Accountant, Support, Viewer.

#### 6.5.4 Consent and DPDP

**Purpose:** Capture and manage consent per India's Digital Personal Data Protection Act 2023.

**Functional requirements**

- Display data-use notice to farmers on first bot interaction. Capture explicit consent before storing any personal data.
- Provide a clear summary of data collected: name, phone, location, crop, booking history.
- Store consent record with timestamp, version of the notice, and the consent text shown.
- Support right-to-delete: farmer can request deletion via bot command or via support, which removes personal data within 30 days and anonymizes operational records.
- Support data export: farmer can request a copy of their data.
- Maintain retention policy: personal data retained 5 years after last interaction; anonymized operational data retained indefinitely.
- Data residency in India — primary storage in an India region (AWS Mumbai, GCP Mumbai, or Azure Pune).

### 6.6 Platform — Booking tier

#### 6.6.1 Booking Engine + State FSM

**Purpose:** Coordinate the full lifecycle of a job from draft to paid. Enforce state transitions through formal FSM. Hold concurrency-safe locks on slot allocation.

**State machine**

| State | Meaning and entry conditions |
|---|---|
| Draft | Bot is collecting fields from the farmer. No slot held. |
| Compliance | All fields collected. Platform checks DGCA UIN and RPC, CIB pesticide, pricing. Pass to Confirmed; fail to Comp. fail. |
| Confirmed | Slot reserved with row-level lock. Supplier notified. Awaiting crew assignment. |
| Crew assigned | Admin (or rule-based assignment) has bound a pilot and drone to the job. |
| In progress | Multi-sortie sub-machine is active. First sortie has taken off (telemetry stream started). |
| Complete | All sorties closed. Telemetry reconciled — coverage ≥ 90% of booked area. |
| Invoiced | Invoice generated with GST classification. UPI QR available. |
| Paid | Payment received and reconciled (manual in V1). |

**Branch states**

- **Wishlist** — entered from Draft when no slot is available. Exit to Compliance when a slot opens and the farmer confirms first.
- **Comp. fail** — entered from Compliance on failure. Terminal unless admin overrides with audited reason.
- **Cancelled** — entered from any active state. Reason captured. Slot released. Wishlist scanned for promotion.
- **Failed** — entered from In progress on pilot abort or drone failure. Partial telemetry preserved.
- **Disputed** — entered from Invoiced or Paid. Support agent assigned. Audit log surfaced for resolution.

**Concurrency requirements**

- Slot allocation must use `SELECT FOR UPDATE` on the slot row to prevent overbooking under concurrent requests.
- Wishlist resolution on slot freeing must atomically (a) decrement available slot, (b) mark the first confirming farmer's job as Confirmed, (c) inform others the slot was taken.
- All state transitions are idempotent — re-applying the same transition by the same event ID is a no-op.
- Telegram webhook deliveries are deduplicated by `update_id`.

#### 6.6.2 Slot Manager

**Purpose:** Express the supplier's daily capacity in terms of slots. Surface free, booked, and full days to the booking engine and the admin dashboard.

**Functional requirements**

- Slot capacity is calculated from operational pilots × operational drones × shifts per day, less any maintenance windows.
- Admin can manually add or remove slots for a day (with reason logged).
- Admin can mark days as unavailable (holiday, off, weather forecast).
- Daily view shows: total slots, booked, free, wishlist length.
- Slot consumption is tied to job size — a 20-acre cotton job may consume more slots than a 3-acre wheat job, configurable per tenant.

#### 6.6.3 Reschedule Engine

**Purpose:** Move a confirmed job to a different date. Dual path: suggest slots or accept manual date entry.

**Functional requirements**

- Suggest mode: admin clicks Reschedule, system surfaces 2–3 open dates near the original.
- Manual mode: admin types a target date, system checks capacity, warns if full, suggests alternatives.
- Rescheduling releases the original slot; wishlist for that date is scanned for promotion immediately.
- Farmer is notified via Telegram with the new date and reason if provided.
- Reschedule preserves the job number but increments a `reschedule_count` counter.

#### 6.6.4 Wishlist Queue

**Purpose:** Hold farmer interest in a fully-booked date and resolve fairly when a slot opens.

**Functional requirements**

- Farmer can join the wishlist for a specific date instead of accepting alternatives.
- Wishlist entries are stored with timestamp, farmer ID, crop, area, and preferred date.
- On slot opening (cancellation, reschedule away, manual capacity add): all wishlist farmers for that date are notified simultaneously.
- First to confirm wins — confirmation is an atomic operation against the freed slot.
- Others receive a Telegram message that the slot has been taken with an offer to remain on the wishlist or pick another date.
- Farmer can remove themselves from the wishlist at any time.

### 6.7 Platform — Drone tier

#### 6.7.1 Drone Fleet

**Purpose:** Maintain the supplier's drone roster as first-class assets, with regulatory and operational metadata.

**Per-drone fields**

- Drone UIN (DGCA Unique Identification Number).
- Manufacturer and model (DJI Agras T20/T40/T50, XAG P100, Garuda Kisan, etc.).
- Payload capacity (kg or L).
- Pesticide compatibility list — which chemicals can be loaded (drift class, viscosity).
- Hours flown lifetime; hours since last service.
- Maintenance schedule with thresholds for routine and major service.
- Battery cycle count; battery health status.
- Last calibration date for spray nozzles.
- Insurance policy reference and expiry date.
- Operational status: Ready, In flight, Maintenance, Out of service.
- Current job binding (when In flight).

**Functional requirements**

- Admin can add, edit, retire drones.
- System surfaces upcoming service due dates and overdue alerts in the dashboard.
- Compliance gate refuses to confirm a job assigned to a drone with service overdue, insurance expired, or status Out of service — admin override available with reason.

#### 6.7.2 Telemetry Ingestion

**Purpose:** Pull flight-log telemetry from the drone manufacturer's API or SD-card upload as the primary anti-fraud signal.

**Functional requirements**

- Integration adapters for DJI FlightHub (V1), XAG (V1.x), Garuda Kisan (V1.x).
- For each sortie, capture: take-off timestamp, landing timestamp, GPS track at 1Hz minimum, altitude, spray pump on/off events, spray volume per event, payload weight, battery use.
- Telemetry stream is persisted as a blob in object storage, plus a structured summary in the database.
- Telemetry stream is associated with the sortie ID, drone UIN, pilot ID, and job ID.
- Late-arriving telemetry (SD-card upload after the fact) is supported with an explicit ingestion timestamp.
- If telemetry is missing or fails to ingest, the job moves to Failed or to a manual-evidence path with admin handling.

#### 6.7.3 Sortie Tracker

**Purpose:** Decompose a job into one or more sorties — each a distinct flight — and track their states independently.

**Sortie state machine**

| State | Meaning |
|---|---|
| Pending | Sortie planned but not started. Pre-flight check pending. |
| Pre-flight | Pre-flight checklist in progress. NPNT request pending or sent. |
| Active | Telemetry stream is open. Drone is in flight. |
| Closed | Telemetry stream is closed. Sortie summary available. |
| Aborted | Sortie ended without completing planned coverage. Reason captured. |

**Functional requirements**

- A job starts with one Pending sortie. Additional sorties are added as needed (after battery swap, refill, or weather pause).
- Each sortie has its own NPNT permission — pre-flight is checked per flight, not once per job.
- Sortie summary captures: area covered, volume sprayed, duration, GPS track polygon, deviations from job area.
- Job moves from In progress to Complete only when total covered area exceeds 90% of booked area across closed sorties.

#### 6.7.4 Incident Tracker

**Purpose:** Capture and route incidents — crashes, near-misses, drift complaints, pilot injuries, equipment failures.

**Functional requirements**

- Pilot can report an incident inline via the Pilot bot.
- Admin can report an incident via the PWA.
- Required fields: incident type, severity, location, parties involved, description.
- Optional fields: photos, video, witness contact, third-party affected (neighboring farm).
- DGCA-reportable incidents (drone crashes, third-party injury) flagged with mandatory DGCA notification within 24 hours.
- Insurance claim path (Phase 2).

### 6.8 Platform — Compliance + Pricing tier

#### 6.8.1 DGCA and NPNT compliance

**Purpose:** Enforce India's drone operating regulations as a platform property.

**Functional requirements**

- Operator UIN (supplier-level) must be valid — captured during onboarding, verified against DigitalSky.
- Drone UIN must be valid for every drone in the fleet.
- Pilot RPC (Remote Pilot Certificate) must be valid — captured during pilot onboarding, validity tracked.
- NPNT permission must be obtained before every sortie — pre-flight gate calls DigitalSky API and stores permission reference.
- Permission grants/denials are recorded in audit log.
- On RPC or UIN expiry, related pilots or drones are marked compliance-blocked. Admin can override with reason for short windows (renewal in progress).
- Red-zone airspace check is invoked during NPNT request — DigitalSky returns flight permission status based on coordinates.

#### 6.8.2 CIB pesticide compliance

**Purpose:** Verify that the pesticide intended for a job is approved by India's Central Insecticides Board for the crop and the drone application method.

**Functional requirements**

- Pesticide name and brand captured during job intake (defaults inferred by crop and spray type).
- CIB approval lookup by pesticide + crop + application method (drone is a distinct method in CIB labels).
- Pre-harvest interval (PHI) check — if the farmer indicates a harvest date close to the spray date, system warns or blocks based on the pesticide's label PHI.
- If pesticide is not CIB-approved for drone use on this crop, job is blocked. Admin can override with reason (logged as override).
- System suggests alternative CIB-approved pesticides via dashboard.

#### 6.8.3 Pricing engine + GST

**Purpose:** Calculate the job price with tax classification.

**Pricing model**

- Base rate: per-acre or per-sortie, configured per tenant in Tenant Settings.
- Travel surcharge: per kilometer above N kilometers from the supplier's depot.
- Chemical-included differential: separate line item if the supplier provides chemicals.
- Crop-specific multiplier: optional adjustment for crops requiring more passes.
- Cancellation policy tiers: free if more than 24h, 50% within 24h, 100% within 4h. Configurable per tenant.
- Weather refund policy: full refund if cancelled by supplier due to weather, configurable.

**GST classification**

- Drone spray service line items classified under SAC 9986 — currently exempt for support services to agriculture.
- Chemicals supplied by the supplier classified by HSN code with applicable GST rate (typically 5%, 12%, or 18% depending on chemical).
- Travel surcharge classified under SAC 9967 (transportation), taxed at applicable rate.
- Cross-state services subject to IGST; intra-state to CGST+SGST.
- Invoice generation produces a GST-compliant invoice with HSN/SAC, taxable value, tax breakdown, and total.

#### 6.8.4 Anti-fraud (telemetry-based)

**Purpose:** Reconcile drone telemetry against the booked job to detect fraud.

**Reconciliation checks**

- Area covered (from telemetry GPS track) ≥ 90% of booked area.
- Volume sprayed per acre within ±25% of the configured target for the crop and pesticide.
- GPS track is within the farmer's stated field polygon (or within a configurable buffer of the GPS location).
- Sortie duration is plausible for the area and drone model.
- Photo and GPS from the pilot are within 500 meters of the telemetry's GPS centroid (corroboration, not gating).
- Photos pass perceptual hash check against pilot's history (rough duplicate detection).

**Outcomes**

- All checks pass: job advances to Complete and invoice is triggered.
- Any check fails: job is flagged for review. Admin reviews and may approve, partial-credit, or fail the job. All actions audited.
- Telemetry stream missing or empty: job moves to Failed state. Admin may use manual evidence path with explicit override.

### 6.9 Platform — Trust + Operations tier

#### 6.9.1 Audit Log

**Purpose:** Immutable record of every meaningful event in the system.

**Event model**

- Event ID, timestamp, tenant ID, actor (system, user ID, or admin), entity ID, entity type, event type, payload, signature.
- Event source classification: auto (system did it), manual (admin created entity directly), override (admin forced a state transition with reason captured).
- Events are append-only — no delete, no edit. Corrections are new events.
- Cryptographic chaining: each event references the hash of the previous event in its tenant scope, providing tamper evidence.

**Audit-eligible events**

- Every job state transition (forward and branch).
- Every slot creation, modification, deletion.
- Every pilot, drone, farmer add/edit/disable.
- Every compliance check pass and fail with reason.
- Every override with admin user ID and reason text.
- Every manual entity creation.
- Every consent capture and DPDP request.
- Every notification dispatched and its delivery status.
- Every login and authentication event.

#### 6.9.2 SLA Monitor

**Purpose:** Track and escalate stalled processes.

**Functional requirements**

- Track elapsed time in each state for every active job.
- Configurable SLA thresholds per tenant: e.g., Draft > 1 hour, Compliance > 5 minutes, Confirmed without Crew assigned > 24h.
- On breach: escalate to admin via Web Push and surface on dashboard.
- On repeated breach: tag the job for review and notify the support agent.

#### 6.9.3 Notifications (Telegram)

**Purpose:** Reliable delivery of Telegram messages to farmers and pilots with retry.

**Functional requirements**

- All outbound Telegram messages routed through a retry queue with exponential backoff.
- Failure to deliver after N retries (configurable) escalates to support.
- Delivery status (sent, delivered, read) tracked where the Telegram API exposes it.
- Messages templated and translated to the recipient's language.

#### 6.9.4 Web Push

**Purpose:** Deliver platform notifications to the Admin and Support PWA, including when the app is closed.

**Functional requirements**

- Web Push API integration via VAPID.
- Push subscriptions stored per-user per-device.
- Notification categories: compliance blocks, SLA breaches, dispute opened, new high-priority enquiry, incident reported.
- User preferences for which categories trigger push.

### 6.10 Platform — Admin + Onboarding tier

#### 6.10.1 Onboarding Wizard

**Purpose:** Capture all data required to activate a new supplier tenant.

**Steps**

- **Step 1 — Sign up and verify:** email or phone, OTP, password.
- **Step 2 — Business identity:** business name, GSTIN, PAN, registered address, state, DGCA operator UIN.
- **Step 3 — Telegram setup:** BYO bot token (instructions for BotFather setup) or opt into shared platform bot; supplier's Telegram chat ID for ops notifications.
- **Step 4 — Team and assets (skippable):** add initial pilots with RPC, name, phone, Telegram ID; add initial drones with UIN, model, insurance.
- **Step 5 — Pricing and payout:** default per-acre rate, cancellation policy tiers, UPI VPA for payouts.
- **Step 6 — Activate:** review, accept DPDP and Terms of Service, launch tenant.

**Validation**

- GSTIN validated against GST portal format. Live verification optional in V1.
- PAN format validated.
- DGCA UIN validated by calling DigitalSky.
- Pilot RPC format validated.
- Drone UIN validated against DigitalSky registration.

#### 6.10.2 Admin Override

**Purpose:** Allow admin to force any state transition or bypass any automated guard, with mandatory reason capture.

**Functional requirements**

- Every state transition gate offers an Override button visible only to roles with override permission.
- Override requires a reason — free text minimum 20 characters.
- Override is logged in audit log as `event_source=override` with the reason and admin user ID.
- Override does not bypass cryptographic integrity — telemetry remains as it was; the override notes are added to the job.
- Override on compliance fail is permitted but flagged for monthly review.

#### 6.10.3 Tenant Settings

**Purpose:** Per-supplier configuration that does not change frequently.

**Categories**

- Business identity (editable; changes audited).
- Telegram bot configuration (bot token, ops Telegram ID, default language).
- Pricing defaults (base rate, surcharges, cancellation tiers, weather policy).
- Users and roles (add admin users, assign roles, revoke access).
- Pilot and drone management (add, edit, retire).
- Notification preferences (which events trigger Web Push).
- Consent and DPDP log (view, export, fulfill deletion requests).
- Audit log access (view, filter, export).

#### 6.10.4 Manual Create

**Purpose:** Bypass the bot-driven flow when needed — walk-in customers, phone bookings, post-hoc record entry.

**Manual-createable entities**

- Farmer record (without Telegram interaction).
- Job record (with all five fields supplied by admin).
- Slot (one-off or recurring).
- Drone (supplemental fleet addition).
- Pilot (mid-month hire).
- Evidence (photos, GPS coordinates, sortie notes when telemetry is missing).
- Incident (post-hoc reporting).
- Payment receipt (manual reconciliation).

**Validation**

- Manually-created jobs still go through Compliance state — DGCA, CIB, pricing all run.
- Admin may override compliance fails as per 6.10.2.
- All manual creations logged in audit log as `event_source=manual`.

### 6.11 Supplier Operations layer

#### 6.11.1 Logistics

Tracks the day's planned routes: which pilot starts where, which drone goes to which job, expected travel time, refill points. Surfaces conflicts (a pilot can't make two distant jobs in the same morning). Manual reordering supported.

#### 6.11.2 Crew Assignment

Binds a pilot and drone to a confirmed job. Validation: pilot RPC valid, drone UIN valid and not under maintenance, drone pesticide-compatible with the job's chemical, pilot and drone not already assigned to overlapping jobs. Assignment can be admin-driven or rule-based (configurable). On assignment, the pilot and drone are notified and the job moves to Crew assigned state.

#### 6.11.3 Invoice Engine

Generates invoice on Complete state transition. Pulls pricing from the job's quote (locked at Confirmed) and final billable area from telemetry. Produces a GST-compliant invoice with line items, HSN/SAC codes, tax breakdown. Supports email delivery, PDF download, and a UPI QR for payment.

#### 6.11.4 QR Payment

Generates a UPI Collect QR with the supplier's VPA, the invoice amount, and the invoice reference. Delivers to the farmer via Telegram. Manual confirmation in V1 — admin marks invoice paid after seeing UPI confirmation in their bank app. Phase 2 automates this through UPI webhook reconciliation.

---

## 7. State machines

### 7.1 Job state machine

The job is the primary entity. It transitions through a deterministic FSM with guards on each edge. Branch states represent off-happy-path terminations or holding patterns. Full details in section 6.6.1.

**Transition guards (summary)**

| From | To | Guard |
|---|---|---|
| Draft | Compliance | All 5 fields collected; farmer confirms summary. |
| Draft | Wishlist | Requested slot is full; farmer chooses wishlist. |
| Wishlist | Compliance | Slot opens and farmer confirms first (atomic). |
| Compliance | Confirmed | DGCA, CIB, pricing all pass. |
| Compliance | Comp. fail | Any compliance check fails. Override possible. |
| Confirmed | Crew assigned | Pilot and drone bound; both available. |
| Crew assigned | In progress | First sortie has taken off (telemetry started). |
| In progress | Complete | Reconciliation passes (area covered ≥ 90%). |
| In progress | Failed | Pilot aborts or drone fails irrecoverably. |
| Complete | Invoiced | Invoice engine produces invoice. |
| Invoiced | Paid | Payment reconciled (manual in V1). |
| Invoiced | Disputed | Farmer raises dispute via bot or support. |
| Any active | Cancelled | Admin or farmer cancels with reason. |

### 7.2 Sortie state machine

Each sortie within a job has its own lifecycle. The job is in In progress state while any sortie is Active. Full state list in section 6.7.3.

**Transition guards (summary)**

| From | To | Guard |
|---|---|---|
| Pending | Pre-flight | Pilot starts pre-flight checklist. |
| Pre-flight | Active | NPNT permission granted; telemetry stream opens. |
| Pre-flight | Aborted | NPNT denied or pilot aborts (with reason). |
| Active | Closed | Telemetry stream ends (landing event). |
| Active | Aborted | Drone failure mid-flight (reason captured). |

### 7.3 Anti-fraud reconciliation

Anti-fraud is not a gate at sortie boundary — it is a gate at job completion. After all sorties are Closed, the system computes aggregate metrics from telemetry blobs and decides whether to advance the job to Complete or flag for review.

**Reconciliation criteria**

| Check | Threshold |
|---|---|
| Area covered vs booked | ≥ 90% (configurable per tenant) |
| Volume per acre | Within ±25% of crop-specific target |
| GPS track within field polygon | ≥ 85% of track points inside polygon buffer |
| Pilot photo GPS vs telemetry GPS | Photo location within 500m of telemetry centroid |
| Photo not in pilot's history | Perceptual hash distance > 8 from any prior photo |
| Sortie duration plausibility | Within drone model's flight time envelope |

---

## 8. User journeys

### 8.1 Farmer booking journey

Happy path: farmer messages the bot, completes the conversation, gets a confirmed job. The narrative below assumes all five fields are collected on first attempt; in practice the bot may need to ask for missing fields.

**Step-by-step**

1. Farmer sends a message to the supplier's Telegram bot. The bot detects the farmer is new (no prior Telegram ID match) and asks for DPDP consent with a clear explanation of data use. Farmer accepts.
2. Farmer describes the spray needed — in Hindi, English, Marathi, or via voice note. NLP engine parses crop, area, date, location intent, spray type. If voice, Voice STT transcribes first.
3. Bot identifies missing fields. Asks for them conversationally in the farmer's language.
4. All five fields collected. Bot triggers slot check via Slot Manager. If slot is free, proceed. If full, bot offers 2–3 alternative dates and wishlist option.
5. Bot presents summary in farmer's language. Farmer confirms.
6. Booking engine creates job in Draft state, transitions to Compliance. Compliance module checks DGCA, CIB pesticide, pricing. Assuming all pass, job moves to Confirmed.
7. Slot is held with row-level lock. Job number generated. Bot delivers job summary to farmer with job number.
8. Supplier admin sees the new job in the PWA. Assigns pilot and drone (or rule-based auto-assign runs). Job moves to Crew assigned.
9. On the booked date, the pilot bot wakes up the assigned pilot with job details and pre-flight checklist.
10. Pilot completes pre-flight check. Bot requests NPNT permission via DigitalSky. Granted.
11. Drone takes off. Telemetry stream begins. Sortie Active.
12. Sortie completes; drone lands. Stream closes. If more area to cover, pilot does battery swap and starts next sortie. Repeat until area covered.
13. Pilot sends final corroborative photo and GPS pin via Telegram bot.
14. Anti-fraud reconciliation runs. Coverage ≥ 90%, volume in range, GPS within field. All pass.
15. Job moves to Complete. Invoice engine generates invoice with GST. UPI QR delivered to farmer via Telegram.
16. Farmer pays. Admin marks paid manually after seeing UPI confirmation. Job moves to Paid. Done.

### 8.2 Pilot job lifecycle

The pilot's role under V7 is operational, not evidentiary. The drone produces the evidence; the pilot's job is to operate the drone correctly.

**Step-by-step**

17. Day before scheduled job: pilot bot sends reminder with job details, farm location, expected area.
18. On the day: pilot bot prompts pre-flight checklist. Confirms battery charged, payload ready, weather acceptable, RPC valid.
19. Pilot bot requests NPNT permission from DigitalSky for the planned sortie. On grant, proceed.
20. Drone takes off. The drone's API or onboard logger streams telemetry to the platform. Pilot's bot displays sortie counter.
21. If battery low or area not yet covered, drone lands, pilot swaps battery, pilot bot prompts next sortie. New NPNT request, new sortie.
22. Repeat until area covered (telemetry confirms).
23. On final landing, pilot bot prompts for corroborative photo and GPS pin.
24. Pilot bot announces job complete (anti-fraud reconciliation runs server-side, not on the pilot's device).
25. If pilot encounters incident — drone crash, weather abort, neighbor complaint — bot offers Incident command to capture details.

### 8.3 Supplier onboarding journey

First-time supplier opens the Admin PWA URL. The onboarding wizard intercepts because the tenant has no completed setup.

**Step-by-step**

26. Supplier admin signs up with email or phone. Receives OTP. Verifies. Sets password.
27. Captures business identity — name, GSTIN, PAN, registered address, state, DGCA operator UIN. System validates UIN against DigitalSky.
28. Telegram setup — supplier chooses BYO bot (with BotFather instructions) or opts into platform shared bot. Captures supplier's personal Telegram chat ID for ops notifications.
29. Optional: adds initial pilots with RPC, name, phone, Telegram ID. Adds initial drones with UIN, model, insurance. Can skip and add later.
30. Sets pricing defaults — per-acre base rate, cancellation tiers, weather policy. Captures UPI VPA for payouts.
31. Reviews setup. Accepts DPDP notice and Terms of Service. Activates tenant. Lands on the main dashboard.
32. Optional: invites additional users to the tenant (operations staff, accountant, support) via Tenant Settings.

### 8.4 Admin operations — daily

A typical day in the admin PWA for an operations manager at a supplier.

**Morning**

- Open PWA. Glance at top status: compliance blocks, invoices due, jobs in progress.
- Resolve any compliance blocks (override with reason, or fix the underlying issue).
- Confirm crew assignments for the day. Check pilot and drone availability.
- Review yesterday's invoices and mark any paid ones.

**Midday**

- Monitor active jobs via the telemetry view — sortie counts, area covered, anomalies.
- Handle new enquiries that the bot collected — confirm pricing for any that need supplier-specific quotes.
- Process reschedule requests.
- Handle wishlist promotions if a slot opens unexpectedly.

**End of day**

- Review completed jobs. Generate any invoices that didn't auto-trigger.
- Reconcile UPI payments.
- Add tomorrow's slot capacity if different from default.
- Glance at audit log for any unexpected events.

---

## 9. Non-functional requirements

### 9.1 Performance

- Bot response time: 95th percentile < 3 seconds from message receipt to bot reply (text); < 8 seconds when voice STT is involved.
- PWA initial load: 95th percentile < 2 seconds on a 4G connection; < 1 second on repeat visits via service worker cache.
- PWA action latency: 95th percentile < 400ms for UI actions; < 800ms for write operations.
- Telemetry ingestion: stream events processed within 10 seconds of receipt at the drone API.
- Compliance check (DGCA, CIB): aggregate < 5 seconds. NPNT pre-flight: < 30 seconds (subject to DigitalSky availability).

### 9.2 Scalability

- V1 target: 1 tenant, 5 pilots, 5 drones, 200 jobs/week, 50 concurrent farmer conversations.
- Phase 2 target: 50 tenants, 250 pilots, 250 drones, 5000 jobs/week, 500 concurrent farmer conversations.
- Architecture must support horizontal scaling of stateless platform modules.
- Database must support multi-tenant indexing with `tenant_id` on every query for partition friendliness.

### 9.3 Reliability

- Platform uptime target: 99.5% in V1, 99.9% in Phase 2.
- Telegram webhook delivery: idempotent processing with `update_id` deduplication.
- Drone telemetry ingestion: at-least-once delivery with deduplication.
- Notification delivery: retry with exponential backoff for up to 24 hours.
- Daily backups; point-in-time recovery for the last 7 days; weekly snapshot retained for 90 days.

### 9.4 Security

- All client-server traffic over HTTPS with TLS 1.2 or higher.
- Telegram webhook signature verification on every inbound request.
- PWA authentication via phone OTP + password or OAuth. Session via JWT with short-lived access token (15 min) and refresh token (7 days).
- Role-based access control with least-privilege defaults.
- All admin override actions logged with admin user ID, IP, and reason.
- Sensitive PII (phone, location) encrypted at rest with tenant-scoped encryption keys.
- Drone telemetry blobs encrypted at rest in object storage.
- API rate limiting per Telegram ID, per IP, per user.
- CSP, CSRF protection, XSS hardening on the PWA.
- OWASP Top 10 mitigations validated via SAST and DAST in CI.

### 9.5 Multi-tenancy

- Every entity row has `tenant_id`. Every query filters by `tenant_id`.
- Tenant-scoped row-level security at the database layer (Postgres RLS) as defense-in-depth.
- Tenant-scoped object storage prefixes.
- Tenant-scoped audit log; no cross-tenant audit visibility.
- Tenant-scoped cache namespaces in Redis.
- Per-tenant configuration (pricing, branding, language, time zone) in Tenant Settings.
- Job number prefix includes tenant identifier.

### 9.6 Privacy and DPDP compliance

- Consent captured on first interaction; consent record retained as audit event.
- Right-to-delete fulfilled within 30 days of request; personal data anonymized while operational data is retained.
- Data export available on request — farmer receives their data in JSON within 14 days.
- Data retention: personal data 5 years post-last-interaction; anonymized aggregates indefinitely.
- Data residency in India region; no cross-border data transfer without explicit consent.
- Data Processing Agreement with each third-party processor (Telegram, drone API providers, payment aggregator, SMS gateway in Phase 2).
- Privacy policy and data-use notice version-tracked; new consent required on material updates.

### 9.7 Localization

- Farmer-facing bot: Hindi, English, Marathi at launch. Punjabi, Telugu, Tamil in subsequent releases.
- Bot localization includes message templates, error messages, confirmation flows, voice STT language detection.
- PWA: English only in V1. Hindi and Marathi in Phase 2/3.
- Date and time formats follow DD/MM/YYYY convention with optional time-of-day phrasing in the farmer's language.
- Currency formatted in INR with localized number grouping (12,34,567).

### 9.8 Accessibility

- PWA meets WCAG 2.1 AA where practical.
- Touch targets minimum 44x44 px on mobile.
- Color contrast ratio ≥ 4.5:1 for normal text.
- Screen reader compatibility for major flows in the Admin PWA.
- Keyboard navigation throughout the PWA.

### 9.9 Observability

- Structured logging from every platform module with `tenant_id`, `event_id`, `correlation_id`.
- Metrics: request rate, error rate, latency, queue depth, telemetry ingestion lag, NPNT permission grant rate, compliance block rate.
- Distributed tracing across modules for slow request investigation.
- Audit log is the source of truth for who-did-what; operational logs are for system behavior.
- Dashboards for operational health, business KPIs, compliance posture.
- Alerting on SLO breaches, error rate spikes, integration failures.

---

## 10. Technical architecture

### 10.1 Recommended stack

The stack below is a recommendation. Substitutions are acceptable provided they satisfy the non-functional requirements.

**Frontend (PWA)**

- Framework: React 18+ with TypeScript, or SvelteKit. Both have strong PWA support and reasonable cold-start times.
- Build tool: Vite for fast HMR and small production bundles.
- PWA tooling: Workbox for service worker generation, manifest authoring, and offline strategy.
- State management: lightweight (Zustand or Svelte stores). Avoid Redux for V1 — overkill at this scale.
- Data fetching: TanStack Query (React) or equivalent with stale-while-revalidate and background refetch.
- UI components: a minimal headless component library (Radix UI for React) with custom styling, or built-in for SvelteKit.
- Forms: React Hook Form or Felte (Svelte) with schema validation via Zod.
- Mapping: Mapbox GL JS or MapLibre GL for telemetry GPS track display.
- Charts: lightweight charting (Chart.js, uPlot, or Recharts for React).

**Backend**

- Language: TypeScript on Node.js, Go, or Python (Django/FastAPI). TypeScript shares types with the PWA.
- Web framework: Fastify or NestJS for TypeScript; Gin for Go; FastAPI for Python.
- Database: PostgreSQL 15+ with row-level security and `SELECT FOR UPDATE` for concurrency.
- Cache: Redis 7+ for sessions, rate limits, hot reads.
- Message queue: Postgres-based job queue (pg-boss, Graphile Worker) for V1 simplicity; migrate to dedicated queue (NATS, Redis Streams) at Phase 2 scale.
- Object storage: S3-compatible (AWS S3, GCS, or self-hosted MinIO) for media and telemetry blobs.
- Search: Postgres full-text search for V1; Meilisearch or Typesense in Phase 2.

**Infrastructure**

- Cloud: AWS Mumbai (ap-south-1), GCP Mumbai (asia-south1), or Azure Pune. India region required for DPDP residency.
- Compute: container-based (ECS, Cloud Run, or AKS). Stateless services scale horizontally.
- Database hosting: managed Postgres (RDS, Cloud SQL, or Azure Database for PostgreSQL).
- CDN: CloudFront, Cloud CDN, or Azure CDN for PWA static assets.
- Secrets: cloud-native secrets manager (AWS Secrets Manager, GCP Secret Manager).
- Monitoring: Datadog, New Relic, or Grafana Cloud for metrics and dashboards. Sentry for error tracking.

### 10.2 Service decomposition

V1 launches as a modular monolith — one deployable backend with internal module boundaries. The boundaries map to the 6 platform tiers. This avoids premature microservice fragmentation while preserving the option to extract services in Phase 2.

**Recommended module structure**

- `conversation` — NLP, Voice STT, Identity, Consent.
- `booking` — Booking engine + FSM, Slot manager, Reschedule, Wishlist.
- `drone` — Fleet, Telemetry, Sorties, Incidents.
- `compliance` — DGCA + NPNT, CIB Pesticide, Pricing + GST, Anti-fraud.
- `trust` — Audit, SLA, Notifications, Web Push.
- `admin` — Onboarding, Override, Tenant Settings, Manual Create.
- `operations` — Logistics, Crew, Invoice, QR.
- `integrations` — Telegram, Drone APIs, DigitalSky, CIB, UPI.

### 10.3 PWA architecture details

- App shell: HTML, CSS, and bootstrap JS cached by service worker on first visit. Subsequent visits load in under a second.
- Service worker strategies: cache-first for static assets, network-first for API GETs with offline fallback, queue-on-fail for mutations.
- Offline writes: queued in IndexedDB; replayed when connectivity returns; conflict resolution policy is server-timestamp-wins for entity edits, with explicit override prompt on conflict.
- Push notifications: VAPID-based Web Push API. Subscription stored per user per device.
- Install prompt: shown after user has used the app for at least 2 sessions or completed a meaningful action.

### 10.4 Concurrency and consistency

- Slot allocation uses `SELECT FOR UPDATE` on the slot row inside a transaction with strict isolation.
- Wishlist resolution is implemented as: lock the slot, check first-confirm flag, set if unset, commit.
- All state machine transitions are guarded by a row-level lock on the entity (job, sortie).
- Idempotency keys on every webhook handler: Telegram `update_id`, Drone API event sequence number, NPNT permission reference.
- Optimistic concurrency on entity edits via version column; conflict surfaces to admin for resolution.

---

## 11. Data model

Core entities. Every entity has `tenant_id`, `id` (UUID), `created_at`, `updated_at`, `version`. The full schema is left to engineering during build, but the entities and relationships below define the contract.

### 11.1 Tenant

The supplier organization. One in V1. Many in Phase 2.

- Identity: business name, GSTIN, PAN, DGCA operator UIN, state, registered address.
- Configuration: pricing defaults, cancellation policy, weather policy, time zone, default language.
- Telegram: bot token or shared-bot opt-in, ops Telegram chat ID.
- Payouts: UPI VPA, optional bank account.

### 11.2 User

Internal user record. Distinct from authentication credentials.

- Roles: Owner, Admin, Operations, Accountant, Support, Viewer, Pilot, Farmer.
- Tenant binding (V1 one tenant; Phase 2 multi-tenant).
- Credentials: phone (with OTP), email + password, Telegram ID, OAuth provider IDs. One-to-many.
- Status: Active, Disabled, Pending.

### 11.3 Farmer

Distinct from User. Farmer-specific metadata.

- Linked User ID.
- Telegram ID (primary contact channel).
- Default language.
- Known farm locations (geo polygons or points).
- Consent record reference.
- Booking history aggregate (denormalized for fast lookup).

### 11.4 Pilot

- Linked User ID.
- RPC (Remote Pilot Certificate) number and expiry.
- Certified drone classes.
- Phone, alternate phone.
- Employment status, joined date.

### 11.5 Drone

- UIN.
- Manufacturer, model, year.
- Payload capacity (L or kg).
- Pesticide compatibility list.
- Hours flown lifetime; hours since service.
- Battery cycle count; battery health.
- Last calibration date.
- Insurance policy reference and expiry.
- Current status, current job binding.

### 11.6 Job

- Job number (`AGR-{tenant}-{state}-{date}-{crop3}-{seq4}`).
- Farmer ID.
- Crop, area (with unit), date, location (lat-lng or polygon), spray type.
- Pesticide name or brand.
- Assigned pilot ID, assigned drone ID.
- Current state, state history (denormalized for audit).
- Pricing snapshot at confirmation.
- Reschedule count, cancel reason if any.
- Linked sorties (one-to-many).

### 11.7 Sortie

- Sortie number within job (1, 2, 3...).
- Pilot ID, drone ID at takeoff.
- NPNT permission reference.
- Takeoff timestamp, landing timestamp.
- Telemetry blob reference (object store).
- Summary: area covered, volume sprayed, GPS centroid, GPS track polygon.
- State.

### 11.8 Slot

- Date.
- Capacity (number of jobs).
- Booked count; locked-for-booking count.
- Notes (e.g., reduced capacity due to maintenance).

### 11.9 Wishlist entry

- Farmer ID, preferred date, crop, area.
- Status: Waiting, Notified, Confirmed, Expired, Cancelled.
- Notification timestamp; confirmation timestamp.

### 11.10 Audit event

- Event ID, timestamp.
- Tenant ID, actor (user ID or system), source type (auto, manual, override).
- Entity type, entity ID.
- Event type, payload (JSON).
- Previous event hash (chaining for tamper evidence).

### 11.11 Incident

- Type (crash, drift, injury, equipment failure, near-miss).
- Severity (low, medium, high, critical).
- Location, parties, third party affected.
- Description, photos, video.
- Linked job, pilot, drone.
- DGCA notification reference if reportable.
- Insurance claim reference (Phase 2).

### 11.12 Compliance check

- Job ID.
- Check type (DGCA UIN, DGCA RPC, CIB pesticide, NPNT, pricing).
- Status: Pass, Fail, Overridden.
- Reference data (DGCA API response, CIB lookup result).
- Override reason if overridden.

---

## 12. Integration specifications

### 12.1 Telegram Bot API

- Use webhook mode (not polling) for production. Polling is acceptable in development.
- Webhook URL receives all update types: messages, callback queries, edited messages.
- Each tenant has its own bot token (V1) or uses the shared platform bot (Phase 2 aggregator).
- Inbound webhook signature: validate the secret token provided during setWebhook.
- Outbound rate limit: respect Telegram's per-bot send rate (30 messages/second global, 1/second per chat).
- Media: photos and voice notes are downloaded immediately via getFile, then re-hosted in object storage. Telegram media URLs expire.
- Idempotency: deduplicate by `update_id`.

### 12.2 Drone manufacturer APIs

**DJI FlightHub (V1)**

- OAuth 2.0 authentication; per-tenant credentials stored encrypted in Tenant Settings.
- Pull flight summaries on schedule (every 60s during active jobs).
- Subscribe to flight events via webhook if available.
- Map DJI drone serial to our internal Drone UIN.

**XAG (V1.x)**

- Direct API integration via XAG's open platform (where available).
- Fallback to SD-card upload pattern: pilot extracts SD card, uploads flight log via PWA.

**Garuda Kisan (V1.x)**

- Direct integration with Garuda's API.
- Fallback to SD-card upload pattern.

**SD-card upload fallback**

- Admin or pilot uploads flight log file via PWA.
- Platform parses format (varies by manufacturer).
- Ingested with a 'manual upload' flag in telemetry metadata for traceability.

### 12.3 DGCA DigitalSky API

- Operator UIN validation: lookup operator by UIN, verify status.
- Drone UIN validation: lookup drone by UIN, verify registration and operator binding.
- RPC validation: lookup pilot by RPC number, verify status and validity period.
- NPNT permission request: submit per-sortie permission request with takeoff coordinates, planned flight envelope, pilot RPC, drone UIN. Receive permission grant or denial.
- Permission grant references stored against the sortie.
- Outage handling: if DigitalSky is down, jobs cannot enter Compliance state. Admin can record manual fallback procedure if available.

### 12.4 CIB pesticide registry

- Lookup pesticide by name or brand.
- Filter by approved crops, application methods (drone is a distinct method).
- Retrieve PHI (pre-harvest interval) and maximum residue limit.
- Likely manual or scraped source initially; explore API access through agricultural data portals.
- Local cache with daily refresh.

### 12.5 UPI

- V1: generate UPI Collect QR code via UPI deep link (`upi://pay?pa=VPA&am=AMOUNT&tn=INVOICEREF`).
- Display QR in Telegram message and on the PWA invoice view.
- Manual reconciliation: admin marks invoice paid after seeing payment in their bank app.
- Phase 2: integrate with a payment aggregator (Razorpay, Cashfree, Paytm) for automatic webhook-based reconciliation.

### 12.6 SMS gateway (Phase 2)

- Primary use: OTP delivery for first-time supplier onboarding.
- Phase 2 use: fallback for farmers when Telegram is unavailable, transactional notifications.
- Provider: MSG91, Twilio, or Karix for India delivery and DLT compliance.

---

## 13. Compliance and legal requirements

### 13.1 Digital Personal Data Protection Act 2023

India's DPDP Act creates obligations for any platform handling personal data of Indian residents.

- Lawful processing — every data point collected must have a lawful basis. For the platform, this is primarily consent and contract performance.
- Notice — display a clear, accessible privacy notice describing what data is collected and why, in the user's language.
- Consent — capture explicit, informed, freely-given consent. Granular consent for distinct purposes (operational use, analytics, marketing).
- Rights of data principals — right to access, correct, delete, and complain. The platform must provide UI for each.
- Right to delete — fulfill within 30 days. Anonymize operational data; remove personal data.
- Data Protection Officer — designate a contact for data protection matters.
- Data residency — store personal data of Indian residents in India. Cross-border transfer only with explicit consent and to whitelisted jurisdictions.
- Data Processing Agreements — with every third-party processor.
- Breach notification — notify the Data Protection Board within 72 hours of awareness.
- Children — special protections for users under 18. Verify age at consent; obtain parental consent where applicable.

### 13.2 DGCA regulations (Drone Rules 2021 and amendments)

- Operator must hold a valid UIN for commercial operations.
- Drones must be registered with a UIN tied to the operator.
- Pilots must hold a valid RPC for the drone class.
- Every commercial flight requires NPNT (No-Permission-No-Take-off) permission from DigitalSky.
- Red-zone, yellow-zone, and green-zone airspace classifications must be respected. Red zones require special clearance.
- Maximum altitude: 400 ft AGL for green zones, lower for yellow.
- Maximum drone weight (in scope for our category): up to 25 kg (Medium / Large).
- Crash and incident reporting: significant incidents must be reported to DGCA within 24 hours.
- Insurance: third-party insurance is mandatory for commercial operators.

### 13.3 CIB Pesticide regulations

- Pesticides used in drone application must be approved by the Central Insecticides Board for that specific method.
- Application label compliance — dosage, dilution, PPE requirements.
- Pre-harvest interval — minimum days between spraying and harvest, per pesticide and crop.
- Restricted-use pesticides — additional licensing for certain chemicals.
- Drift prevention — buffer zones near water bodies, schools, organic farms.

### 13.4 GST

- Drone spray service classified under SAC 9986 (support services to agriculture, forestry, fishing, animal husbandry). Currently exempt from GST.
- Chemicals supplied as part of service: taxed at applicable HSN-based rate (typically 5%, 12%, or 18%).
- Composite supply vs mixed supply: if chemicals are bundled with service and the principal supply is service, may qualify for exemption (legal review required).
- Cross-state services: IGST applies.
- E-invoicing: if turnover threshold exceeded, e-invoicing via GSTN is required.
- GSTR returns: monthly or quarterly filing obligations.

### 13.5 Trade and consumer protection

- Consumer Protection (E-Commerce) Rules 2020 apply if the platform mediates transactions.
- Display return, refund, and grievance redressal policies.
- Grievance officer designation.

---

## 14. Phase 2 scope

Items scoped out of V1 but planned for the next major release.

### 14.1 Automated UPI reconciliation

- Integrate with payment aggregator (Razorpay, Cashfree, Paytm).
- Webhook-based payment confirmation.
- Automatic mark-paid on UPI webhook.
- Reconciliation reports for accounting.

### 14.2 Lead generation and analytics

- Seasonal demand forecasting per crop and region.
- Geographic clustering — identify dense booking pockets for marketing.
- Retention analytics — repeat customer rate, time to second booking.
- Conversion funnel — enquiry to confirmation rate, drop-off points.
- Supplier performance benchmarks (in aggregator scope).

### 14.3 Multi-supplier aggregator

- Multi-tenant SaaS model with hosted bot per supplier.
- Lead routing — when a farmer enquires near multiple suppliers, route based on proximity, availability, supplier rating.
- Commission tracking and supplier payouts.
- Cross-supplier farmer identity — a farmer interacting with one supplier's bot is recognized when interacting with another.
- Aggregator-level dashboard for platform operators.

### 14.4 SMS and IVR fallback

- SMS for farmers without Telegram or during Telegram outage.
- Multilingual IVR for voice-first farmers.
- Two-way SMS conversation flows for booking.
- Cost-aware routing — cheaper SMS for transactional, voice only for high-value interactions.

### 14.5 Insurance and incident claims

- Insurance policy management at the drone and operator level.
- Incident-to-claim workflow.
- Integration with insurance providers' claim portals.
- Premium analytics — pilot risk score, drone risk score.

### 14.6 Pilot PWA

- Pilot-facing PWA alongside the Telegram bot.
- Richer telemetry display, route planning, multi-job day overview.
- Optional for pilots; Telegram bot remains the simple default.

### 14.7 Multilingual admin dashboard

- Hindi and Marathi UI for the Admin PWA.
- Locale-aware date and number formatting.
- Translated email and PDF invoice templates.

### 14.8 Farmer ratings and reviews

- Post-job rating prompt to farmer via Telegram.
- Aggregate ratings displayed in aggregator phase.
- Supplier response capability.
- Moderation pipeline for abusive or false reviews.

---

## 15. Risks and open questions

### 15.1 Technical risks

- **Voice STT accuracy:** Hinglish code-switched audio with rural accents and farm noise is hard for general-purpose models. Mitigation: pilot with multiple providers (OpenAI Whisper, Google STT, AI4Bharat models); measure transcription accuracy on real recordings; budget for human handoff when confidence is low.
- **Drone API coverage:** DJI FlightHub has the broadest install base in India but limited public API access. XAG and Garuda APIs are less standardized. Mitigation: build adapters; fall back to SD-card upload; partner with manufacturer dealers where needed.
- **DigitalSky API reliability:** Government APIs are not always available. Mitigation: cache permission grants where the spec allows; surface outages clearly; document manual procedures.
- **Telegram outage:** The platform's primary channel is a third-party service. Mitigation: SMS fallback in Phase 2; ensure outage detection and admin alerts.
- **Multi-tenant data isolation:** Bugs in tenant scoping can leak data across suppliers. Mitigation: row-level security as defense-in-depth; tenant-scope assertion in every query; integration tests with multi-tenant fixtures.

### 15.2 Regulatory risks

- **DPDP Act enforcement:** Rules and enforcement evolving. Mitigation: track Data Protection Board guidance; build flexible consent mechanisms; conduct annual privacy review.
- **DGCA rule changes:** Drone rules amended periodically. Mitigation: version compliance logic; subscribe to DGCA notifications; design override paths for transition periods.
- **Pesticide approval changes:** CIB approval lists change. Mitigation: daily refresh of local cache; surface changes to admin.
- **GST classification disputes:** SAC 9986 exemption may be challenged. Mitigation: legal review; collect supporting documentation; design system to add tax if rules change.

### 15.3 Operational risks

- **Pilot identity loss:** Pilot loses phone, can't access Telegram bot. Mitigation: Identity Service allows credential rotation; admin can rebind.
- **Wishlist starvation:** Some wishlist farmers may never get a slot. Mitigation: surface waiting time on dashboard; suggest alternatives proactively.
- **Override abuse:** Admin overrides compliance habitually. Mitigation: monthly override review; ratio of overrides to clean confirmations as a tracked metric.

### 15.4 Open questions

- Should the platform offer pesticide sourcing in Phase 2, or remain neutral on chemical procurement?
- How are pilots paid? Through the supplier directly, or through the platform with deduction at source?
- Should farmers be able to book directly with a specific pilot they trust, bypassing the supplier's assignment?
- How do we handle disputes that escalate beyond support — to the consumer court, to DGCA, to the police? What is the platform's evidence release policy?
- Do we partner with FPOs (Farmer Producer Organizations) for bulk bookings? If so, how does that change the booking model?
- Should the platform white-label per supplier in V1 (supplier-branded bot, supplier-branded PWA), or maintain neutral branding?

---

## 16. Success metrics

### 16.1 Business KPIs

- Weekly active farmers — distinct farmers messaging the bot.
- Bookings completed per week.
- Booking-to-completion rate (bookings that reach Paid state).
- Average revenue per job.
- Time from first message to first booking (farmer acquisition latency).
- Repeat booking rate (farmers with > 1 lifetime jobs).

### 16.2 Operational KPIs

- Slot utilization (booked / capacity).
- Compliance block rate (jobs hitting Comp. fail before override).
- Override rate (overrides / total state transitions).
- Reschedule rate.
- Cancellation rate by tier (free, 50%, 100%).
- Time-to-assignment (Confirmed to Crew assigned).
- Sortie efficiency (planned sorties vs actual).

### 16.3 Quality KPIs

- Bot NLP confidence average; human handoff rate.
- Voice STT transcription confidence average.
- Anti-fraud reconciliation pass rate.
- Dispute rate (Disputed / Invoiced).
- Net Promoter Score (post-job survey).

### 16.4 Platform health KPIs

- Uptime (SLO 99.5% V1).
- p95 bot response time.
- p95 PWA action latency.
- Telemetry ingestion lag.
- DigitalSky NPNT grant rate and latency.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| CIB | Central Insecticides Board — Indian regulator for pesticide approval. |
| DGCA | Directorate General of Civil Aviation — Indian regulator for drones. |
| DigitalSky | DGCA's online platform for drone registration and flight permissions. |
| DPDP Act | Digital Personal Data Protection Act 2023 — India's data protection law. |
| FCFS | First-come, first-served. Used for wishlist resolution. |
| FSM | Finite state machine — formal model of states and transitions. |
| GSTIN | Goods and Services Tax Identification Number — business tax ID in India. |
| HSN | Harmonized System of Nomenclature — product classification for GST. |
| NPNT | No-Permission-No-Take-off — DGCA's per-flight permission mechanism. |
| OTP | One-Time Password — for phone or email verification. |
| PAN | Permanent Account Number — Indian tax identification. |
| PHI | Pre-Harvest Interval — minimum days between pesticide application and harvest. |
| PWA | Progressive Web App — installable web application. |
| RPC | Remote Pilot Certificate — DGCA pilot license. |
| SAC | Services Accounting Code — service classification for GST. |
| Sortie | A single drone flight within a job. A job may have multiple sorties. |
| STT | Speech-to-text — voice transcription. |
| UIN | Unique Identification Number — DGCA-issued ID for operators and drones. |
| UPI | Unified Payments Interface — India's instant payment system. |
| VPA | Virtual Payment Address — UPI handle, e.g., business@bank. |
