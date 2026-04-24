# POS Client Web App (PWA)

> SaaS Point-of-Sale — Client-Facing Dashboard & Cashier Terminal

Next.js 15 · React 19 · TypeScript · Tailwind CSS · PWA · Offline-First

---

## What This Is

The web application used by business owners, store managers, and cashiers. It has two distinct surfaces:

1. **Dashboard** — Full management panel for owners and managers (inventory, reports, settings, staff, etc.)
2. **Cashier POS** — Streamlined point-of-sale terminal for cashiers to ring up sales

The app is a **Progressive Web App (PWA)** with a service worker and offline mode powered by IndexedDB — sales can be made even without an internet connection and are synced automatically when connectivity is restored.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS |
| State | Zustand |
| Data Fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Offline Storage | IndexedDB via `idb` |
| Real-time | Socket.IO client |
| Icons | Lucide React |
| Toasts | Sonner |
| Date Utilities | date-fns |
| Language | TypeScript |

---

## Project Structure

```
pos-client_frontend/
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── src/
│   ├── app/
│   │   ├── (dashboard)/    # Management dashboard (role-gated)
│   │   │   ├── overview/       # KPI cards + charts
│   │   │   ├── inventory/      # Products, stock levels, import, labels
│   │   │   ├── sales/          # Sales history + receipt viewer
│   │   │   ├── customers/      # Customer profiles + loyalty
│   │   │   ├── suppliers/      # Supplier management
│   │   │   ├── purchase-orders/# PO creation and tracking
│   │   │   ├── reports/        # Revenue reports + EOD report
│   │   │   ├── discount-rules/ # Discount codes and rules
│   │   │   ├── tax-rates/      # GST rate configuration
│   │   │   ├── stores/         # Multi-store management
│   │   │   ├── staff/          # User management
│   │   │   └── settings/       # Company settings + branding
│   │   ├── (pos)/
│   │   │   └── cashier/        # Full-screen POS terminal
│   │   └── login/              # Auth page
│   ├── lib/
│   │   ├── api.ts              # Axios instance with auth headers
│   │   ├── utils.ts            # Helper utilities
│   │   └── offline/
│   │       ├── db.ts           # IndexedDB schema + operations
│   │       └── syncEngine.ts   # Offline → online sync logic
│   └── store/
│       ├── auth.ts             # Zustand auth store (user, company, tokens)
│       └── modules.ts          # Module feature-flag hooks
```

---

## Pages

### Dashboard (`/dashboard/*`)

| Route | Description |
|---|---|
| `/overview` | Sales KPIs, revenue charts, low-stock alerts |
| `/inventory` | Product catalogue with stock levels |
| `/inventory/stock` | Per-store stock view and adjustments |
| `/inventory/import` | Bulk product import |
| `/inventory/labels` | Barcode label printing |
| `/sales` | Sales transaction history |
| `/sales/receipt/[id]` | Individual receipt view |
| `/customers` | Customer list with loyalty points |
| `/suppliers` | Supplier directory |
| `/purchase-orders` | Purchase order management |
| `/reports` | Revenue and sales reports |
| `/reports/eod` | End-of-day report |
| `/discount-rules` | Promo codes and discount rules |
| `/tax-rates` | GST/tax rate configuration |
| `/stores` | Store locations and settings |
| `/staff` | Staff accounts and roles |
| `/settings` | Company settings, branding, module toggles |

### Cashier POS (`/cashier`)
Full-screen POS terminal: barcode scanning, cart management, payment (Cash / Card / UPI), receipt printing, offline sale queuing.

---

## Offline Mode

The app uses **IndexedDB** (via the `idb` library) to support offline operation:

| Store | Contents |
|---|---|
| `products` | Cached product catalogue (indexed by barcode for fast scanner lookups) |
| `pendingSales` | Sales made while offline, queued for sync |
| `offlineMeta` | Misc offline metadata |

When the browser detects it is back online, `syncEngine.ts` automatically posts all pending sales to the backend and marks them as synced.

```
Offline sale made
  → saved to IndexedDB (pendingSales)
  → browser comes back online
  → syncEngine iterates pending sales
  → POST /api/v1/sales for each
  → marks sale as synced in IndexedDB
```

---

## Feature Flags (Module System)

Each company has a `settings` object that toggles modules on or off (controlled by the Creator Panel and the company's subscription plan). The client app uses these flags to show or hide features:

```ts
// Hide a menu item if the module is disabled for this company
const canSeeSuppliers = useModuleEnabled('suppliers');
const canSeeReports   = useModuleEnabled('reports');
```

Available modules: `multiStore`, `productVariants`, `weightBasedProducts`, `expiryTracking`, `loyaltyPoints`, `suppliers`, `stockTransfer`, `discountRules`, `gstBilling`, `customerProfiles`, `reports`, `offlineMode`

---

## Auth

JWT-based authentication. Access token is stored in memory (Zustand). Refresh token is used to obtain a new access token. The Axios instance automatically attaches the `Authorization: Bearer <token>` header to every request.

**User Roles:**
- `OWNER` — Full dashboard access
- `MANAGER` — Operational access (no billing/settings)
- `CASHIER` — Cashier POS only

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment

The app talks to the backend at the URL configured in `src/lib/api.ts`. Make sure the backend (`pos_backend`) is running on port 3001.

### 3. Run

```bash
# Development
npm run dev        # → http://localhost:3002

# Production
npm run build
npm start
```

---

## Demo Login (after seeding the backend)

| Role | Email | Password |
|---|---|---|
| Owner | owner@shopmart.com | admin123 |
| Manager | manager@shopmart.com | staff123 |
| Cashier | mike@shopmart.com | staff123 |
