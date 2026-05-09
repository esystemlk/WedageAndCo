# Security Specification - Fleet Operations & Procurement

## Data Invariants
1. A **LogSheet** must have a valid `logSheetCode` and cannot be modified once `status` is 'Completed' unless by an admin.
2. **PurchaseOrders** must have a valid `poNumber` and their `grandTotal` must be the sum of item totals.
3. **GoodsReceivedNotes** should ideally reference a valid `PurchaseOrder`.
4. **DailyVehicleUpdates** must be unique per vehicle per day (Business logic, but rules should restrict cross-user writing).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a LogSheet with `enteredBy` set to another user's email.
2. **Sequential Bypass**: Attempt to create a PO without a `poNumber` (Service should generate it, but rules must require it).
3. **Status Hijacking**: Attempt to move a LogSheet from 'Completed' back to 'On Trip'.
4. **Orphaned Write**: Attempt to create a LogSheet for a non-existent `vehicleId`.
5. **PII Leak**: A non-admin user attempting to list all `User` profiles and see `uid` or private fields.
6. **Double Entry**: Attempt to create two DailyUpdates for the same vehicle on the same day in a single batch (Rules can't fully prevent without state, but we check identity).
7. **Negative Value**: Attempt to set `grandTotal` of a PO to a negative number.
8. **Shadow Field**: Attempt to add `isAdmin: true` to a User profile update.
9. **Role Escalation**: A 'driver' attempting to approve a Purchase Order.
10. **Meter Poisoning**: Attempt to set `startMileage` to a 1MB string.
11. **Freezer Tempering**: Attempt to set `freezerTemp` to an extreme value like 1000°C.
12. **Gate Bypass**: Attempt to update a `GatePass` status to 'Returned' without a `timeIn`.

## The Test Runner (Conceptual)

All these attempts must return `PERMISSION_DENIED` via the following ruleset.
