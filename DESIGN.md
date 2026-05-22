# IMS Pro: Design System & User Experience Guide

## 1. Product Identity: Asset Intelligence
**IMS Pro** is an **Asset Intelligence System** designed for enterprise fleet and hardware operations. It is built for high-speed technician workflows where visual precision and operational velocity are the primary "North Stars."

## 2. Native Shape: The Hardware Lifecycle Pipeline
The application does not follow a generic section-based layout. Instead, it is organized around the **Native Shape of Hardware**: a linear, high-integrity pipeline.
- **INGESTION**: Physical registration (Single, CSV Mass Upload, or Rapid Scanner).
- **EVALUATION**: The Technical Workbench (QC matrix validation).
- **SYNTHESIS**: Hierarchy Building (Polymorphic Linking via the Capability Matrix).
- **DEPLOYMENT**: Atomic Scan-to-Stage Dispatch.
- **MAINTENANCE**: Unit Swaps & RMA History.

## 3. Visual Weight: Central Command
The **Asset Dashboard & Bundle Building** feature dominates the system. 
- **Primary Weight**: The virtualized device list, supporting 1,000+ rows with nested "Linked Children."
- **Focus Pattern**: Large, high-contrast **Identifiers** (IMEI, ISN, ICCID) rendered in `Geist Mono` to distinguish hardware data from interface labels.
- **Interactive Staging**: Complex transactions (Dispatch/Link) use a "Staging Area" visual pattern to ensure atomic commits.

## 4. Visual DNA & Tokens
Derived from the project's CSS and component implementation.

### The Zinc Scale (Structural)
- **Background**: `#09090b` (Deep Zinc) - Zero-distraction dark mode.
- **Surface/Card**: `#09090b` (Primary) / `#18181b` (Secondary).
- **Borders**: `#27272a` (Subtle definition).

### Intentional Accents (Status-Driven)
- **Action**: Primary Orange (Interactive intent only).
- **Passed**: Emerald (QC success, Valid relationships).
- **Failed**: Red (Damaged units, Diagnostic failures).
- **Critical**: Amber (Stock alerts, Critical test items).

### Typography
- **UI Labels**: `Geist` / `Inter` (Tight tracking, high density).
- **Hardware Data**: `Geist Mono` (IMEI, ISN, Serial, MSISDN).
- **Metadata**: Condensed uppercase for technical classifications (e.g., `HW REVISION`, `SPEED CLASS`).

## 5. Component Blueprints & Portals
- **Portal-Only Popups**: To prevent clipping in virtualized tables and fixed modals, ALL floating UI (Dropdowns, Selects) render via **Radix Portals** to the document `<body>`.
- **Fixed-Height Ingestion**: Bulk operation modals are locked to `90vh`. Only the data table scrolls, while the **Target Template Model** and **Commit Bar** remain fixed.
- **Sticky Matrix Headers**: Table headers are always visible to maintain context for field labels like `Phone Number (MSISDN)` and `Carrier`.

## 6. High-Velocity Interaction
- **Scan-to-Stage**: Every input supports physical barcode scanners with auditory feedback hooks.
- **System-Managed Status**: Status logic is locked to the system. Technicians influence status through **Evaluation** results (Pass/Fail) rather than manual selection.
- **Atomic Commits**: No state-change happens without a reviewable staging list, preventing data drift in high-volume environments.
