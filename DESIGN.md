# IMS Pro: Design System & User Experience Guide

## 1. Product Identity
**Product Name:** IMS Pro  
**Tagline:** Asset Intelligence System  
**Mission:** High-performance hardware lifecycle management for enterprise fleet operations.

## 2. Native Shape: The Hardware Pipeline
The design of IMS Pro is not a collection of sections, but a **Pipeline**. Every screen represents a specific state in the hardware's existence within the system:
- **INGESTION**: Physical registration (Single or Bulk).
- **EVALUATION**: The Technical Workbench (QC Bench).
- **SYNTHESIS**: Polymorphic Linking (Bundle Building).
- **DEPLOYMENT**: Atomic Scan-to-Stage Dispatch.
- **MAINTENANCE**: Unit Swaps & RMA.

## 3. Visual Identity & Tokens

### Color Palette (Zinc Scale)
- **Background**: `bg-background` (#09090b) - Deep Zinc.
- **Surface**: `bg-card` (#09090b) / `bg-muted` (#18181b).
- **Border**: `border-border` (#27272a).
- **Foreground**: `text-foreground` (#fafafa) / `text-muted-foreground` (#a1a1aa).

### Intentional Accents
- **Action/Primary**: Orange (Action items, Active states).
- **Success/Pass**: Emerald (QC Passed, Valid Links).
- **Error/Fail**: Red (QC Failed, Damaged Stock).
- **Warning/Critical**: Amber (Stock Alerts, Critical QC Items).

### Typography Scale
- **Interface Label**: Geist / Inter (Sans-serif) - Tracking tight for professional density.
- **Hardware Identifier**: Geist Mono - Essential for IMEI, ISN, and Serial differentiation.
- **Hierarchy**: Use uppercase tracking-widest for secondary headers (e.g., `TECHNICIAN CHECKLIST`).

## 4. Component Blueprints

### The "SaaS-Elite" Table
- **Layout**: `table-fixed` with explicit percentage-based widths.
- **Interaction**: Row-hover states using `hover:bg-muted/30`.
- **Safety**: Horizontal scrolling container with `overflow-x-auto` but `overflow-y-visible` to allow portal menus.
- **Density**: Compact rows with high-contrast text.

### The Technician Modal
- **Constraints**: Locked to `max-h-[90vh]`.
- **Structure**: Fixed Header (Tabs), Scrollable Content (Data Table), Fixed Footer (Action Bar).
- **Focus**: Auto-focus on primary scanner input fields.

### Floating UI
- **Mechanism**: MUST use **Radix Portals**.
- **Strategy**: Floating above the container to prevent clipping in scrollable areas.

## 5. Interaction Vocabulary
- **Scan-to-Stage**: Every physical scan should provide auditory feedback (Success beep / Error buzz).
- **Atomic Commit**: Actions that move state (Dispatch, Swap) should be grouped and reviewed in a "Staging Area" before final execution.
- **Audit-First**: Every destructive or state-changing action must have a visible confirmation or an immediate entry in the Audit History.
