# Jacob's — Barbershop Booking App

A premium, mobile-first booking app for Jacob's Barbershop, designed to feel like a native iOS app: Apple Human Interface Guidelines, an iOS 26–inspired Liquid Glass design language, and a strict black-and-white palette.

![Light mode](docs/preview-light.jpg)
![Dark mode](docs/preview-dark.jpg)

## Run it

```bash
npm install
npm run dev
```

To try it on your phone, run `npm run dev -- --host`, then open the network URL on the same Wi-Fi. In Safari, **Share → Add to Home Screen** installs it as a full-screen app with its own icon.

```bash
npm run build     # type-check + production build to dist/
npm run lint      # oxlint
```

## What's inside

| Tab | What it does |
| --- | --- |
| **Home** | Personalised greeting, the next appointment as a Wallet-style pass (directions, add to calendar, reschedule), a prominent booking button with the next free slot, lookbook carousel, services and prices, barbers with their next availability, live open/closed status, hours and map. |
| **Lookbook** | Filterable masonry gallery. Tapping a look opens it full-screen with a shared-element transition; drag down to dismiss, or book that exact look. |
| **Bookings** | Upcoming and history in a segmented control. Reschedule, cancel (with confirmation sheet), add to calendar, rebook past visits. |
| **Profile** | Loyalty stamp card, light/dark/automatic appearance, notification preferences, contact links. |

**Booking flow** is a native-style card sheet (the app scales back behind it, as on iOS): service → barber (or "any barber") → date and time → review → confirmation. Lists advance automatically after a choice; availability updates per barber and per day; confirmed bookings can be exported to Calendar as `.ics`.

Appointments and settings persist in `localStorage`.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4**, with design tokens modelled on iOS system colours (`src/index.css`)
- **shadcn/ui**: Button, Drawer (vaul), Avatar and Switch in `src/components/ui`, restyled to iOS proportions
- **Motion** for spring physics, shared-layout transitions and gestures; loaded lazily with `LazyMotion` so it stays off the critical path
- **Lucide** icons

## Design system

- **Type**: SF Pro on Apple devices (Inter elsewhere) on the iOS Dynamic Type scale, exposed as `text-large-title`, `text-title1`…`text-caption2`.
- **Colour**: grouped background `#F2F2F7` with white cards; true black with `#1C1C1E` cards in dark mode. Sheets sit one elevation level up in dark mode.
- **Liquid Glass**: the `glass` utility (blur, saturation, specular rim, soft sheen) is used where it earns its place: the floating tab bar, the booking button, sheet controls and collapsed navigation bars.
- **Motion**: springs throughout (`src/lib/motion.ts`). Press feedback is a CSS spring via `linear()` easing (`pressable` utility). `prefers-reduced-motion` is respected.
- **Navigation**: large titles that stretch on overscroll and hand off to a compact glass bar. Every tab stays mounted, so scroll position and state survive tab switches.

## Project layout

```
src/
  App.tsx                 shell: tab screens, tab bar, sheets
  data/shop.ts            ← all business content (sample data — replace)
  store/                  app state, persistence
  screens/                home, lookbook, bookings, profile
  features/booking/       booking sheet and its steps
  features/lookbook/      full-screen look viewer
  components/             app components (pass, list, tab bar, …)
  components/ui/          shadcn/ui primitives
  lib/                    schedule, formatting, calendar export, links
```

## Before launch

- **Replace the sample content** in `src/data/shop.ts`: address, phone, WhatsApp, Instagram, hours, prices, team and the customer profile are all placeholders.
- **Add real photos**: put images in `public/` and set `image` on a look (e.g. `image: '/lookbook/skin-fade.jpg'`) or `photo` on a barber. Until then, the lookbook shows generated monochrome artwork and barbers show monograms.
- **Connect a backend**: availability is simulated deterministically in `src/lib/schedule.ts` (`slotsFor`), and bookings live in the browser. Swap those for the real booking API.
