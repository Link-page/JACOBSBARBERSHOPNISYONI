# JACOB'S — Barbershop Booking App

A premium, mobile-first booking app for JACOB'S barbershop, in Hebrew (RTL). It has its own identity: warm monochrome neutrals, ink surfaces, and a single brass accent. Display type is Frank Ruhl Libre (titles and numerals); UI text is Heebo.

![Light mode](docs/preview-light.jpg)
![Dark mode](docs/preview-dark.jpg)

## Run it

```bash
npm install
npm run dev
```

The app is served under `/JACOBSBARBERSHOPNISYONI/` (the GitHub Pages path) in development too, so open the URL Vite prints, e.g. `http://localhost:5173/JACOBSBARBERSHOPNISYONI/`. To try it on your phone, run `npm run dev -- --host` and open the network URL on the same Wi-Fi. In Safari, **Share → Add to Home Screen** installs it full-screen with its own icon.

```bash
npm run build     # type-check + production build to dist/
npm run lint      # oxlint
```

## Deployment

**Live site:** https://link-page.github.io/JACOBSBARBERSHOPNISYONI/

- **Production branch: `main`.** Every push to `main` runs `.github/workflows/deploy.yml`.
- **What the workflow does:** installs dependencies, lints, builds, and publishes `dist/` to GitHub Pages. A failed build never replaces the live site.
- **Re-deploy without a code change:** Actions → *Deploy to GitHub Pages* → *Run workflow*.
- **Base path:** set once in `vite.config.ts` (`base`). Files in `public/` must be referenced through `publicUrl()` (`src/lib/public-url.ts`) so they resolve under that path.
- **Required repository setting:** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.

## What's inside

| Tab | What it does |
| --- | --- |
| **בית (Home)** | Greeting, next-appointment card (directions, add to calendar, reschedule), booking button with the next free slot, gallery, services and prices, team with each barber's next opening, live open/closed status, hours and map. |
| **גלריה (Gallery)** | Filterable masonry; tap a look to open it full-screen (drag down to dismiss) and book it. |
| **התורים (Bookings)** | Upcoming and history: reschedule, cancel (with confirmation), add to calendar, rebook. |
| **פרופיל (Profile)** | Loyalty stamp card, appearance (automatic / light / dark), notification preferences, contact links. |

### Booking flow

A sheet with five steps: **service → barber → day → time → summary**. Selections are kept when moving back and forth.

- **Day: full-month calendar** (Sunday-first, RTL). Navigate with the arrows or by swiping between months. Each day shows its state:
  - brass bar: appointments available (longer bar = more free slots)
  - hollow ring: fully booked, but still tappable for the waiting list
  - faded number: closed, past, or beyond the 60-day booking window (not tappable)
- **Time: separate screen.** Tapping a day opens a vertical list of large time rows grouped into morning, afternoon and evening, with sticky group headers and a fixed Continue button.
- **Waiting list.** A fully booked day opens the same time screen with an empty state and a **הצטרפות לרשימת המתנה** button. It registers the date, barber and service, then shows a confirmation; joining twice reports that you're already on the list.

## No backend yet: what that means

All data goes through `src/api`. The active implementation, `localBookingApi`, runs on the device:

- availability comes from a simulated diary (`src/api/local/shop-diary.ts`) with quiet days, busy days and fully booked days
- bookings and waiting-list requests are stored in `localStorage`

It reports `connected: false`, and the UI reflects that honestly. Confirmations say the request was **saved on this device and not sent to the shop**; they never claim the shop received it. To go live, implement the `BookingApi` interface (`src/api/booking-api.ts`) against the real server and export it from `src/api/index.ts`. The UI needs no changes; the confirmation copy switches automatically.

## Architecture

```
src/
  api/                     data access — the only layer that talks to a backend
    booking-api.ts         BookingApi contract
    types.ts               DTOs (DayAvailability, TimeSlot, WaitlistRequest, …)
    local/                 on-device implementation, simulated diary, waitlist storage
  booking/                 pure domain logic (no React)
    availability.ts        day status and free slots from hours + occupancy
    calendar.ts            month grid, browsable range
    day-parts.ts           morning / afternoon / evening grouping
    opening-status.ts      open now / next opening
  hooks/                   useQuery (cached, race-safe), availability hooks, delayed loading flag
  features/booking/
    booking-sheet.tsx      composes header, step stage and action bar
    use-booking-flow.ts    step machine and selections
    booking-header.tsx · booking-actions.tsx · step-stage.tsx
    steps/                 one file per step
    calendar/              month calendar, header, weekday row, day cell, availability mark, legend
    time/                  slot list, day-part section, slot row, skeleton
    waitlist/              fully-booked empty state
    hooks/                 confirm booking, join waiting list
  features/lookbook/       full-screen look viewer
  screens/                 home, lookbook, bookings, profile
  components/              shared app components; components/ui = shadcn/ui primitives
  data/shop.ts             ← all business content (sample data — replace)
  store/                   app state and persistence
  lib/                     dates, Hebrew formatting, direction, calendar export, links
```

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Button, Drawer/vaul, Avatar, Switch), Motion (lazy-loaded with `LazyMotion`), Lucide icons.

Motion is used for spring selection indicators (calendar day, time row, tabs), direction-aware step and month transitions, and the confirmation emblem. `prefers-reduced-motion` is respected throughout.

## Before launch

- **Replace the sample content** in `src/data/shop.ts`: address, phone, WhatsApp, Instagram, hours, prices, team and the customer profile are placeholders.
- **Add real photos**: put images in `public/` and set `image` on a look or `photo` on a barber, as a path inside `public/` without a leading slash (e.g. `image: 'lookbook/skin-fade.jpg'`).
- **Connect the booking backend** (see above). Cancelling an appointment currently updates the device only and doesn't go through `src/api` yet.
