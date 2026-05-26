# IMS Pro: Project Intelligence & Architectural Mandates

## 1. Codebase Purpose
**IMS Pro: Asset Intelligence System** is a high-performance lifecycle management platform for enterprise fleet and hardware inventory. It is designed for high-speed technician workflows, supporting rapid physical scanning, complex hardware hierarchy (bundling), and atomic dispatch transactions.

## 2. Core Goals & "The North Star"
- **Operational Velocity**: Technicians should never wait for the UI. Use virtualization, optimistic updates, and hot-key/scanner-first inputs.
- **Data Integrity**: Enforce strict relational linking between devices (Parent-Child) through a validated "Capability Matrix".
- **Traceability**: Every hardware movement (Ingest -> QC -> Dispatch -> RMA) must generate a persistent audit log.
- **Hardware-First**: Optimize for physical barcode scanners (`useHotScanner`) with auditory feedback loops.

## 3. Critical Files & Source of Truth
- **Domain Layer (`/packages/shared/src/domain`)**: 
    - `device.ts`: Asset definitions.
    - `qc.ts`: Diagnostic checklist logic and default test matrix.
    - `customer.ts`: Formal Company and Individual Operator schemas.
    - `deviceModel.ts`: Capability matrices and asset classification.
- **API Engine (`/backend/src/index.ts`)**: The unified service layer using Elysia.js. No protocol-specific logic.
- **Database Schema (`/backend/src/db/schema.ts`)**: Drizzle models mirroring the domain. Includes `customers` and `device_audit_logs`.
- **Technical Workbench (`/frontend/src/components/screens`)**: 
    - `QCBench.tsx`: Manual diagnostic checklist workflow.
    - `DeviceInventory.tsx`: Virtualized list with hierarchy management.
    - `CustomerDispatch.tsx`: Relational dispatching to registered customers.
    - `Customers.tsx`: Registry and device distribution history.

## 4. Design System & Visual Identity
- **Aesthetic DNA**: "SaaS-Elite" (NeoBase). High-density, minimalist, and utilitarian.
- **Color Tokens**: Zinc-based background (#09090b), Orange (Action), Emerald (Pass), Red (Fail/Damage).
- **Component Mandates**:
    - **Portals Only**: ALL dropdowns, selects, and tooltips must use portals to escape table/modal clipping.
    - **Fixed Modals**: Ingestion modals are locked to `90vh` with internal scrolling for visual stability.
    - **No Manual Status**: Device status is system-managed. Technicians cannot manually set status during ingestion (defaults to `IN_STOCK`).

## 5. Domain Terminology
- **Staging**: Temporary holding area for devices before an atomic dispatch.
- **Capability Matrix**: Rules defining allowed child assets (SIM, SD) for specific parent models.
- **Technical Workbench**: Physical environment for hardware QC.
- **Atomic Swap**: Simultaneous return and deployment of replacement hardware.
- **Identifier**: Universal term for Serial, IMEI, or ISN (displayed in `Geist Mono`).

## 6. Global Workflow Mandates
- **Plan-First Workflow**: ALL investigations and implementations MUST begin with a structured **Implementation Plan** and a **Task Checklist**. These must be presented to the user and approved before any code modifications are performed. This rule applies globally across all modules and tiers of the application.
