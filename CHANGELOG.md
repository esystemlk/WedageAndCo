# Changelog

## 2026-10-16 — Security Book Updates

Source: client-provided action item list ("Security Book System Updates & Action Items").

### 1. Gate Pass & Invoice Verification
- Removed the **Invoice & Billing Verification** section from the general Vehicle In/Out Pass form ([GatePassFormPage.tsx](src/pages/security/GatePassFormPage.tsx)). Hired vehicles no longer need an invoice to exit — the gate pass no longer collects or requires one.
- The Vehicle In/Out list view now shows the entry **Reason** instead of the old invoice badge ([GatePassListPage.tsx](src/pages/security/GatePassListPage.tsx)).

### 2. Goods Inward / Material Receiving (new tab)
- This section already existed in the code (vehicle/stores invoice verification with supplier, invoice no., qty, price) but had **no navigation button**, so it was unreachable in the UI. Added a **"Goods Inward / Material Receiving"** tab to the Security Book ([GatePassListPage.tsx](src/pages/security/GatePassListPage.tsx)) so it can actually be used.
- **Invoice & Billing Verification** now lives exclusively in this tab.
- Added a **Private Vehicle** target type (free-text plate entry) alongside Fleet Vehicle and Yard/Stores, so goods arriving on a private (non-fleet) vehicle can be logged.
- No odometer/meter field exists in this section (it never did), so private vehicles have nothing to omit — requirement satisfied by the existing data model.
- Updated `SecurityBillCheck` type ([securityBillService.ts](src/services/securityBillService.ts)) to accept `'Private Vehicle'`.

### 3. Form Validation & Workflow Fixes
- **Reason is now mandatory** on every Vehicle In/Out entry, not only for "Test Run"/"Other" trips — the field is always shown and blocks submission until filled ([GatePassFormPage.tsx](src/pages/security/GatePassFormPage.tsx)).
- **Vehicle Booking notifications bug fixed**: `alertService.ts` declared a `'booking'` alert category but never generated any alerts for it, so pending bookings never reached the notification bell. Added logic to emit an alert per pending booking (linking to `/fleet/bookings`) ([alertService.ts](src/services/alertService.ts)).

### 4. Visitor & External Vehicle Management
- Added an **Edit** action for Visitor & External Vehicle records. Clicking Edit opens the existing log drawer pre-filled with that record's data; saving now updates the record in place instead of only supporting create/checkout/delete ([GatePassListPage.tsx](src/pages/security/GatePassListPage.tsx)).

### 5. Inventory — Issuing items directly (client inquiry, no code change)
Investigated `src/pages/inventory/` and `src/services/inventoryService.ts`:
- **Fuel** and **Oil/Lubricant** already have dedicated issuance screens (`FuelIssueFormPage.tsx`, `OilIssueFormPage.tsx`) that record vehicle/driver/quantity and automatically deduct stock.
- **All other categories** (filters, parts, battery, electrical, stationery) have **no issuance screen**. Only a generic `adjustInventoryStock()` function exists in code — it is not exposed as a feature, so staff cannot currently issue these items to a department/person from the UI.
- **Answer to client**: general item issuance is not currently supported; it would need a new feature (an "Issue Item" form similar to the Fuel/Oil ones) to be built.

### Verification
- `npx tsc --noEmit` — passes with no errors.
- `npm run build` — production build succeeds.
- Not verified: live click-through in a browser (no Firebase credentials available in this environment — only `.env.example` is present, no real project config to sign in against).
