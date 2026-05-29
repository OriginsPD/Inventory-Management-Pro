# IMS Pro: Asset Intelligence System

A high-performance, strictly client-side Single Page Application (SPA) for enterprise fleet and inventory operations. Built with the **TanStack Ecosystem** and **Bun/Elysia**.

## 🚀 Quick Start

1.  **Launch Environment:**
    ```powershell
    docker compose up -d
    ```
2.  **Access Terminal:**
    - Frontend: `http://localhost:5173`
    - API Docs: `http://localhost:3002/swagger`
3.  **Initial Credentials:**
    - *Note: Run initial migrations to setup the DB schema before first login.*
    - `admin@ims.pro` / `password123` (Example)

---

## 📖 Application Tutorial

IMS Pro is designed for high-speed hardware processing. Below are the core workflows for technicians and warehouse managers.

### 1. Asset Dashboard & Bundle Building
The **Devices** screen is your central command.
- **Virtualization:** The list supports 1,000+ rows with 60fps scrolling thanks to TanStack Virtual.
- **Nested Rows:** Click the arrow `▶` next to an identifier to see its linked children (e.g., a Tracker showing its internal SIM and SD Card).
- **Building a Hierarchy:**
    1. Use the **Bundle Builder** at the top of the page.
    2. Scan a **Parent** identifier (Tracker).
    3. Scan a **Child** identifier (SIM).
    4. The system validates the "Capability Matrix" (defined in Models) and creates the link with an auditory confirmation beep.

### 2. Atomic Dispatch (Scan-to-Stage)
Move stock to customers in a single, atomic transaction.
1. Navigate to the **Dispatch** screen.
2. Select a **Customer** and optional **Location**.
3. Use your physical scanner to rapid-fire scan unit identifiers.
4. **Bundle Auto-Pull:** If you scan a "Parent" device, IMS Pro automatically pulls all its linked "Children" into the staging area for you.
5. Review the staged list and click **Execute Dispatch**. A **Transaction Report** will summarize the results.

### 3. Technical Workbench (QC)
Perform diagnostics on incoming or faulty hardware.
1. Navigate to **Testing**.
2. Scan a device identifier.
3. Perform your physical QC check.
4. Click **PASS** (moves unit to `IN_STOCK`) or **FAIL** (moves unit to `DAMAGED`).
5. Enter an **Auth/Activation Code** if required and save the record to the audit trail.

### 4. Atomic Unit Swaps
Replace hardware deployed at a customer site without losing history.
1. Navigate to **Swap**.
2. Scan the **Old (Faulty) Device**.
3. Scan the **New (Replacement) Device** (must be `IN_STOCK`).
4. Select the Customer and provide a reason.
5. Commit the swap to update both device statuses and record the link in one transaction.

---

## 🛠️ Technical Stack

-   **Frontend:** React 19, Vite, TanStack Router (Type-safe), TanStack Query (Sync), TanStack Table v8.
-   **Backend:** Bun, ElysiaJS, Drizzle ORM, PostgreSQL.
-   **Hardware:** Custom `useHotScanner` hook for physical imagers; WebRTC/ZXing for mobile camera scanning.
-   **Resilience:** PWA support with Workbox caching for metadata (Offline Field Mode).
-   **Localization:** i18next (English, Spanish, Portuguese).

## 🔒 Security
-   **Better Auth:** Session-based authentication with cross-origin cookie support.
-   **Auth Guards:** All routes are protected via TanStack Router's `beforeLoad` hook.
-   **Audit Logs:** Every mutation triggers an entry in the `audit_logs` table for compliance.

## Documentation

- [Application Guide](docs/overview.md)
- [Architecture](docs/architecture.md)
