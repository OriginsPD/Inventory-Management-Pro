# IMS Pro: Project Intelligence & Architectural Mandates

## 1. Codebase Purpose
**IMS Pro: Asset Intelligence System** is a high-performance lifecycle management platform for enterprise fleet and hardware inventory. It is designed for high-speed technician workflows, supporting rapid physical scanning, complex hardware hierarchy (bundling), and atomic dispatch transactions.

## 2. Core Goals & "The North Star"
- **Operational Velocity**: Technicians should never wait for the UI. Use virtualization, optimistic updates, and hot-key/scanner-first inputs.
- **Data Integrity**: Enforce strict relational linking between devices (Parent-Child) through a validated "Capability Matrix".
- **Traceability**: Every hardware movement (Ingest -> QC -> Dispatch -> RMA) must generate a persistent audit log.
- **Hardware-First**: Optimize for physical barcode scanners (`useHotScanner`) with auditory feedback loops.

## 3. Critical Files & Source of Truth
- **Domain Layer (`/packages/shared/src/domain`)**: The absolute source of truth for all schemas (Device, Customer, QC, Model). All TS types must be inferred from these Zod schemas.
- **API Engine (`/backend/src/index.ts`)**: The unified service layer using Elysia.js. No protocol-specific logic; both REST and internal handlers must call the same domain logic.
- **Database Schema (`/backend/src/db/schema.ts`)**: Drizzle models that strictly mirror the shared domain layer.
- **Technical Workbench (`/frontend/src/components/screens`)**: 
    - `QCBench.tsx`: Manual diagnostic checklist workflow.
    - `DeviceInventory.tsx`: Virtualized list with hierarchy management.
    - `CustomerDispatch.tsx`: Atomic scan-to-stage dispatch logic.

## 4. Design System & Visual Identity
- **Aesthetic DNA**: "SaaS-Elite" (NeoBase). High-density, minimalist, and utilitarian.
- **Color Tokens (Zinc Scale)**:
    - Neutral Background: `bg-background` (Zinc-950)
    - Border/Surface: `border-border` (Zinc-800)
    - Action/Intent: Primary Orange (Action), Emerald (Passed), Red (Failed/Damaged), Amber (Critical).
- **Typography Hierarchy**:
    - **Sans**: `Geist` / `Inter` for interface copy and labels.
    - **Mono**: `Geist Mono` for all hardware identifiers (IMEI, ISN, ICCID, Serial).
- **Component Rules**:
    - **Portals Only**: All dropdowns, tooltips, and popovers MUST use Radix UI Portals to escape table/modal clipping.
    - **Fixed Modals**: Modals for data ingestion must have fixed heights (`90vh`) with independent internal scroll areas.
    - **Sticky Headers**: All data tables must use sticky headers to maintain context during deep scrolling.

## 5. Domain Terminology
- **Staging**: The temporary holding area for devices before an atomic dispatch.
- **Capability Matrix**: Rules defining which child assets (SIM, SD) can be linked to which parent models.
- **Technical Workbench**: The environment for physical hardware QC and evaluation.
- **Atomic Swap**: The simultaneous return of a faulty unit and deployment of its replacement.
- **Identifier**: Universal term for Serial, IMEI, or ISN.
