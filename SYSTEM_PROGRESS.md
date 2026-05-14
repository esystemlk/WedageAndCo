# Comprehensive System Modernization Report: Wedage & Co. CRM

## 1. Executive Summary
The Wedage & Co. CRM has undergone a complete architectural and aesthetic overhaul. The system has transitioned from a manual/static workflow to a **real-time, cloud-integrated Enterprise Resource Planning (ERP)** solution. Every operational module is now backed by a robust Firebase backend, ensuring data integrity, traceability, and high-speed performance.

---

## 2. Core Module Deep-Dive

### 🚛 Advanced Fleet Management
*   **Infrastructure**: Managed via the `fleet` collection in Firestore.
*   **Vehicle Classification**: 
    - Dedicated support for **Freezer Trucks** (temperature-controlled logistics) and **Dry Trucks**.
    - Detailed specs: Chassis No, Engine No, Length, Width, Height, and Weight Capacity (Tons).
*   **Ownership & Legal Logic**:
    - **Owned Assets**: Tracked for internal depreciation and maintenance.
    - **Rented Assets**: Complex tracking of Owner Name, Address, NIC/BR, Agreement Cycles (Start/End dates), and Payment Rates (LKR).
*   **Document Management**: 
    - Digital storage for **Lease Agreements** and **Handover Condition Reports** (PDF/Image URLs).
*   **Visual Identity**: Multi-image gallery for each vehicle to track physical condition over time.

### 👥 Personnel & HR Systems
*   **Infrastructure**: Managed via the `staff` collection.
*   **Specialized Roles**: Driver, Helper, Cleaner, Office Staff, and Garage technician.
*   **Health & Safety Dossier**:
    - Blood type tracking for emergency medical situations.
    - **Emergency Protocol**: Primary contact name, relationship, and 24/7 phone number.
*   **Legal Compliance Dossier**:
    - High-resolution digital copies of: Police Report, Grama Niladari Certificate, Birth Certificate, and National ID (NIC).
*   **Operational Control**: Toggle-based "Active/Inactive" status to manage payroll and trip assignments.

### 🤝 Client Relationship Management (CRM)
*   **Infrastructure**: Managed via the `customers` collection.
*   **Granular Contact Management**:
    - Utilizes dynamic field arrays for tracking multiple **Operations Contacts** and **Billing Contacts**.
    - Each contact includes Name, Role, Phone, and Email.
*   **Financial Configuration**:
    - **VAT Toggle**: Enables/disables VAT calculation per client.
    - **Customer Type**: Segmented into Permanent (Contractual) and Temporary (Spot) clients.
*   **Agreement Tracking**: Digital storage for signed Service Agreements with validity period monitoring.

### 📅 Daily Operations & Deployment
*   **Daily Asset Logging**: 
    - Real-time "Tactical Status" updates: *On Trip, Yard Parking, Breakdown, Under Repair*.
    - **Data Points**: Date, Odometer Reading (KM), Fuel Pumped (Liters), Route, and Driver/Helper assignment.
*   **Customer Attribution**: Direct link between vehicles and customers for accurate utilization analytics.
*   **Firestore Sync**: Every update is time-stamped and tagged with the entering user's ID for auditability.

---

## 3. Operations Calendar & Scheduling
*   **Service Engine**: Powered by `calendarService.ts`.
*   **Event Types**: Trips, Maintenance, Meetings, and Holidays.
*   **Sri Lankan Localization**:
    - Integrated **2026 Public Holiday & Poya** data.
    - Auto-detection of Poya days with specific visual cues (Rose-based styling).
    - Sidebar featuring the next 5 upcoming national holidays for scheduling awareness.
*   **Interactive Modal**: Comprehensive event editing with start/end time validation.

---

## 4. Technical Architecture & Security

### 🔐 Security Infrastructure
*   **Authentication**: Firebase Auth with persistence.
*   **Permission Gates (`PermissionGate`)**: 
    - UI components and routes are restricted based on user roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`).
*   **Audit Logging**:
    - The `recordChange` utility logs every CREATE, UPDATE, and DELETE action to the `audit_logs` collection.
    - Tracks: User Email, Action Type, Collection, Entity ID, and Timestamp.

### 🎨 Design System (The "Wedage Look")
*   **Aesthetic**: Premium Glassmorphism (blur backdrops, subtle borders).
*   **Typography**: 
    - **Outfit**: Headings and branding.
    - **Inter**: Data tables and functional text.
    - **Playfair Display**: Sophisticated italic accents.
*   **Responsive Engine**: `AppShell` architecture ensuring full functionality on Tablets and Desktop.

### 📦 Database Collections Overview
| Collection | Purpose |
| :--- | :--- |
| `fleet` | Vehicle specifications, ownership, and images. |
| `staff` | Employee dossiers, documents, and emergency info. |
| `customers` | Client profiles, contacts, and VAT settings. |
| `daily_updates` | Daily vehicle status and operational logs. |
| `logs` | Detailed trip sheets and mileage records. |
| `calendar_events` | Scheduled tasks, maintenance, and holidays. |
| `audit_logs` | System-wide traceability and security logs. |

---

## 5. Roadmap: Phase 3
1.  **Revenue Analytics**: linking `logs` data to invoice generation.
2.  **Maintenance Predictor**: Alerts based on mileage tracking from `daily_updates`.
3.  **Inventory Stock Logic**: Connecting `GRN` and `PO` modules to real-time stock levels.
4.  **PWA Optimization**: Enhancing offline capabilities for driver mobile use.

---
**Report Integrity Verified**: May 14, 2026
**Lead Engineer**: Antigravity AI (DeepMind Team)
**System Status**: 💎 Stable / Feature Complete for Core Modules
