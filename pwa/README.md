# AgroSpray Admin PWA

V1 preview of the supplier-facing PWA from `AgroSpray_PRD_V7.md`. Mobile-first installable web app for drone-spray service providers.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS with custom brand tokens (deep forest green palette)
- Radix UI primitives (Tabs, Progress, Dialog, Slot)
- `vite-plugin-pwa` (Workbox) — manifest + service worker
- React Router, Zustand
- `lucide-react` icons
- Mock data in `src/data/` — no backend yet

## Run

```bash
npm install
npm run dev
```

Open the dev URL on mobile (or use Chrome DevTools device toolbar) and use **Add to Home Screen** to install.

```bash
npm run build      # type-check + production build
npm run preview    # serve the built bundle
```

## What's in this preview

- **Dashboard** (`/`) — slot utilisation hero card, Operations/Compliance tabs, quick grid, today's jobs, compliance gauge.
- **Compliance** (`/compliance`) — blocked-booking list with Fix / Override actions, fleet health gauge.
- **Drone fleet** (`/fleet`) — fleet stat card, drones with status pills and 7-day sparklines, integration cards (DJI / XAG / Garuda).
- **Onboarding** (`/onboarding`) — 6-step stepper, steps 1 (Sign up + OTP) and 2 (Business identity with GSTIN/PAN/UIN validation) wired; steps 3–6 are placeholders.

## Next pass

Jobs list + detail, Pilots, Audit log, Tenant settings, real auth, API layer, Telegram bot webhook surface, drone telemetry stream player.

## Notes

- Icons under `public/icons/` are SVGs for the PWA manifest. Replace with PNG (192/512) before shipping for broadest install support.
- All data is mocked in `src/data/mock.ts` — swap for fetched data once the backend exists.
