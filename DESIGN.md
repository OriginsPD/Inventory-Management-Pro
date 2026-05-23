# IMS Pro: Functional & Operational Specifications Blueprint (Design-Agnostic)

This document outlines the complete functional requirements, workflows, forms, inputs, data requirements, buttons, actions, and logical states of **IMS Pro**. It is structured to be **design-agnostic** so that automated UI generation tools, Figma AI, or UI/UX designers can freely restructure the visual interface, typography, layout, density, and color schemes while maintaining the exact operational states and flows of the application.

---

## 1. Global Terminal Preferences & Core Operations

These features run in the background or provide global context across the entire application.

### A. Terminal Configuration & System Context
- **Theme Preferences**: Supports toggling between `Light`, `Dark`, and `System` settings.
- **Accent Color**: Supports selecting accent color identifiers (`Zinc`, `Orange`, `Amber`, `Emerald`, `Indigo`) used to style active elements, statuses, or highlights.
- **Layout Density**: Toggles spacing preferences between `Standard` and `Compact`.
- **Acoustic Feedback**: Toggles synthesized terminal sound effects (success tones for valid entries, low buzzer tones for formatting/validation errors, and indicator chirps for staging actions).
- **Database Status**: Displays connection state to the persistent storage server (e.g., `pg.neon.tech`).
- **Offline Mode & Sync Queue**:
  - The system detects offline terminal states.
  - When offline, data-mutating inputs are temporarily cached in local storage.
  - An offline alert displays, showing the number of cached items in queue.
  - A **"Sync Queue"** action commits cached records to the database when connectivity is restored.

### B. Global Barcode Scanning Wedge
- **Action**: A background listener intercepting high-speed serial entries (keyboard inputs completed in `< 35ms`).
- **Operational Logic**:
  - If a compatible input form is open (e.g. Single Ingest or Bulk Link fields), the scanned barcode auto-fills the active identifier field.
  - If no form is open, scanning a barcode auto-initiates the **Bulk Ingestion workflow** and appends the serial number to the staging queue.
  - Triggers success/failure tone feedback based on validation checks.

---

## 2. Workflows & Screen-by-Screen Specifications

---

### MODULE 1: Warehouse Dashboard (Main Hub)

**Purpose**: Provide an executive summary of warehouse metrics, stock levels, recent changes, and recommendations.

#### 1. Data Requirements (What to Display)
- **Warehouse KPI Metrics**:
  - *Total Hardware Count*: Registered assets in the system.
  - *Active Dispatched Count*: Units deployed to customers (status: `DISPATCHED`).
  - *Testing Bench Count*: Units undergoing evaluation (status: `TESTING`).
  - *Ready Stock Count*: Units available for deployment (status: `IN_STOCK`).
  - *QC Pass Rate Percentage*: Average pass rate score.
- **Activity Velocity Trend Data**:
  - Data points representing logs grouped by day over a 7-day period.
- **Asset Class Breakdown**:
  - Proportional composition ratios of classifications (e.g. `TRACKER`, `SIM`, `SD_CARD`, `PANIC_BUTTON`).
- **Model Stock Health Register**:
  - List of device models containing: Model name, brand, classification type, ready stock count, target maximum stock limit, and stock health status (`HEALTHY` [>=60% of target], `WARNING` [30%-59%], `LOW` [<30%]).
- **Recent Operations Log**:
  - Chronological activity feed showing: Action type (e.g. Ingest, Link, Delete, Swap), details text, operator handle, and relative timestamp.
- **Warehouse Recommendations**:
  - Actionable alerts (e.g. "SIM card stock level is below threshold", "Tracker TRK-982103 flagged as damaged, needs evaluation").

#### 2. User Actions & Controls (Buttons)
- **Data Series Toggle**: Switches the Activity Velocity Trend chart between displaying "Dispatches" and "Ingestions".
- **Quick-Start Shortcuts**:
  - **"Scan Incoming Box"**: Navigates directly to the Device Inventory screen and launches the bulk ingestion form.
  - **"Link CSV Matrix"**: Navigates to the Device Inventory screen and launches the bulk linking form.
  - **"RMA Swap Board"**: Navigates directly to the Hardware Swaps page.

---

### MODULE 2: Device Inventory & Ingestions Registry

**Purpose**: Manage registered hardware, perform bulk uploads, edit device details, and bind child components.

#### 1. Data Registry View
- **Controls & Filters**:
  - *Fuzzy Search*: Filters device lists by serial, model template, or type.
  - *Status Filter*: Dropdown filtering by device status (`IN_STOCK`, `DISPATCHED`, `TESTING`, `DAMAGED`, `RMA`, or `All`).
  - *Model Filter*: Dropdown filtering by model template.
  - *Column Selector*: Toggles visibility of specific grid headers.
- **Data Fields**:
  - *Device Identifier (Serial/IMEI)* (rendered in monospaced font).
  - *Classification Type* (e.g. SIM, SD Card, Tracker).
  - *Model Template Name*.
  - *Status Indicator* (`In Stock`, `Dispatched`, `Testing`, `Damaged`, `RMA Swap`).
  - *Attributes*: Dynamic key-value pairs representing custom metadata (e.g., SIM card phone numbers and carrier names).
  - *Linked Accessories*: Summarizes attached secondary units.
- **Row Action Options**:
  - **"View Asset Profile"**: Opens details view.
  - **"Manage Relationships"**: Opens linking tool.
  - **"Edit Properties"**: Opens edit form.
  - **"Decommission Unit"**: Destroys device record after warning confirmation.
- **Multi-Selection Actions**:
  - Allows checking multiple rows (on the current page or across the entire database).
  - **"Bulk Delete"** button: Unlinks and deletes all selected devices permanently.

#### 2. Form: Single Ingest / Edit Device
- **Inputs**:
  - *Identifier (Serial)*: Text input.
  - *Model Template*: Select dropdown of templates.
  - *Dynamic Metadata Fields*: Renders custom inputs based on the classification of the selected template:
    - If `SIM`: Requires *Phone Number (MSISDN)* and *Network Carrier*.
    - If `SD_CARD`: Requires *Storage Capacity* and *Speed Class*.
    - If `TRACKER`: Requires *Firmware Version* and *Hardware Revision*.
    - If `PANIC_BUTTON`: Requires *RF Frequency* and *Button Color*.
- **Rules**: Form submission is validated against the model's identifier regex pattern (if defined). Saving a new device defaults its status to `IN_STOCK`.

#### 3. Form: Bulk Operations (Ingestions & Linkings)
- **Bulk Ingest Tab**:
  - *Target Model Template Selector*: Dropdown specifying the model configuration.
  - *CSV Import Wizard*:
    - Drag-and-drop CSV parser.
    - *Column Mapper*: Map CSV headers to database attributes (`Serial`, `Meta Field 1`, `Meta Field 2`).
    - *Preview Grid*: Displays first three parsed rows.
  - *Continuous Barcode Scanner Input*: Accepts barcode scans, auto-appends to the staging queue, filters duplicates, and verifies serials against the model regex pattern.
  - *Ingestion Queue*: Lists staged items with text fields for inline metadata editing, a "Remove" button per item, and a "Clear List" button.
  - **"Commit Ingestion"** Action: Saves all valid staged devices to the database.
- **Polymorphic Linking Tab**:
  - *CSV Matrix Link Card*: Accepts a two-column CSV mapping primary tracker serials to secondary child serials.
  - *Pairing Scanner Input*: Focuses two input boxes sequentially (Step 1: Scan parent serial -> Step 2: Scan child serial). Commits pair on enter.
  - *Staged Links List*: Displays pairings with status badges (`Valid Link`, `Invalid Link` [fails allowed-children or circular cycle rules]) and a "Remove" button.
  - **"Commit Relationships"** Action: Saves all valid linkages to the database.

#### 4. Details View: Asset Profile
- **Information Panel**: Read-only grid displaying template model, brand, class, status, parent/child relationships, and full metadata attributes.
- **Activity History**: Vertical scrollable log of database audit records tied to this device.

#### 5. Form: Manage Hardware Links
- **Parent connection**: Shows the parent serial with an "Unlink" button. If empty, displays a search selector containing compatible, in-stock parents.
- **Child connections**: Lists current child serials with "Unlink" buttons. If child capacity remains, displays search selectors for compatible, in-stock accessories.
- **Constraints**: Enforces classification compatibility (allowed children) and prevents circular loops (e.g., adding parent as child of child).

---

### MODULE 3: Model Templates

**Purpose**: Define device specifications, serial regex patterns, and allowed secondary components (child rules).

#### 1. Data Requirements (What to Display)
- **Model Templates Grid**:
  - *Model Name*.
  - *Manufacturer Brand*.
  - *Classification Type* (e.g., TRACKER, SIM, SD_CARD).
  - *Allowed Child Types*: Lists types of secondary assets this device can accept (e.g., a Tracker template allows SIM and SD Card child attachments).
  - *Regex Validation Pattern*: The barcode pattern string used to check ingested serials.
  - *Max Stock Target*: Warning threshold number.

#### 2. User Actions & Controls (Buttons)
- **"New Model Template"**: Opens creation form.
- **"View"**: Opens read-only details card.
- **"Edit"**: Pre-populates the template form.
- **"Delete"**: Deletes the model configuration. Fails if registered devices reference this template.

#### 3. Form: Create / Edit Model Template
- **Inputs**:
  - *Model Name*: Text input.
  - *Brand*: Text input.
  - *Asset Classification*: Dropdown select box.
  - *Max Stock Target*: Number input.
  - *Barcode Pattern (Regex)*: Text input.
  - *Allowed Secondary Components*: Checkbox selections of polymorphic child asset types.

---

### MODULE 4: Customer Dispatch

**Purpose**: Stage and dispatch hardware bundles to client accounts, and review dispatch run histories.

#### A. Dispatch Console
- **Staging Queue Configuration**:
  - *Customer / Fleet Selector*: Dropdown choosing the target customer entity.
  - *Stage Devices Selector*: Opens the selection overlay to choose available in-stock devices.
  - *Staged Queue*: List of queued parent trackers. Displays warning indicators if a tracker has linked accessories (child components automatically dispatch with the parent) or if a component is tied to another parent.
  - *Queue Actions*: "Clear Queue" and "Remove" per item.
  - **"Confirm Dispatch"** Action: Updates the status of all queued trackers and their linked child assets to `DISPATCHED`, assigns them to the customer, and stamps operator metadata with the current date-time.

#### B. Stage Devices Selector Form
- **Backdrop Overlay**: Shows available devices with checkboxes.
- **Filters**: Fuzzy search and classification type selectors.
- **Footer**: Summarizes selections and features a **"Stage Selected"** commit button.

#### C. Dispatch Registry History
- **Registry Filters**: Fuzzy text search, asset category filter, and link topology filter (`Linked Clusters`, `Standalone Only`).
- **Registry Data Table Columns**:
  - *Dispatch Timestamp*: Date and time of dispatch.
  - *Customer / Fleet*: Company name.
  - *Primary Units*: Count of root devices.
  - *Total Components*: Total items count (including children).
- **Batch Actions**:
  - **"View Details"**: Opens a recursive hierarchical tree view of the dispatch batch, showing parent-child links.
  - **"Return Stock"**: Recursively resets all devices in the batch and their child components to `IN_STOCK` and removes customer metadata.

---

### MODULE 5: QC Bench (Technical Workbench)

**Purpose**: Evaluate returned or untested devices using diagnostic check sheets and live telemetry gateway queries.

#### 1. Selection Directory Table
- **Data Range**: Displays devices with statuses `IN_STOCK`, `TESTING`, or `DAMAGED`.
- **Columns**: Monospaced serial number, model template, QC status badge (`Passed`, `Failed`, `Untested`), and last test date.
- **Action Button**: **"Start QC Test"** (loads diagnostic workbench form).

#### 2. Workbench Form & Check sheet
- **Form Header**: Displays active serial number, model details, and current status.
- **Live Gateway Telemetry Diagnostics**:
  - **"Run Diagnostics"** Action: Queries the cell network gateway.
  - *Returned Diagnostics Data*: Displays network operator, signal strength (dBm), and battery calibration voltage.
  - *Auto-fill Rule*: Automatically marks Power/Battery check sheet fields as `Passed` or `Failed` based on voltage thresholds (`>= 3.6V` passes), and SIM/GPS fields based on signal strength (`> -105 dBm` and satellite lock counts pass).
- **Technician Checklist Matrix**:
  - Lists 8 test checkpoints (e.g. GPS, SIM, Power, Battery).
  - Each item contains: Checkpoint title, critical flag indicator, **"Pass"** toggle button, **"Fail"** toggle button, and comments input field.
  - *Critical Failure Rule*: If a checkpoint marked as "Critical" is toggled to "Fail", the entire device QC report is flagged as failed.
- **Action Footer**:
  - **"Complete QC Report"** Button: Disabled until all checklist items are answered. On submission:
    - Updates metadata with tester name, timestamp, and checklist answers.
    - If passed: Sets status to `IN_STOCK`.
    - If failed: Sets status to `DAMAGED` (locking it from dispatch staging).

---

### MODULE 6: RMA Swaps

**Purpose**: Perform hot-swaps of faulty deployed hardware with warehouse stock.

#### 1. Form: Log Replacement Swap
- **Inputs**:
  - *Faulty Field Unit*: Select box of active dispatched units.
  - *Replacement Warehouse Unit*: Select box of in-stock ready units.
- **Operational Logic**:
  - When the faulty unit is selected, the form displays a list of its linked child components.
  - **"Perform Unit Replacement Swap"** Action:
    - Returns the faulty unit to the warehouse with status `DAMAGED` and stamps a link reference to the replacement unit.
    - Dispatches the replacement unit to the customer, and automatically unlinks child components from the faulty unit and binds them to the replacement tracker.

#### 2. Swapped Units Registry Table
- **Columns**: Faulty serial number, model template, customer, replacement serial (or `Awaiting Swap` if none), and swap date.
- **Controls**: Search input and pagination.

---

### MODULE 7: Customers CRM

**Purpose**: Manage client accounts and trace their hardware allocations.

#### 1. Customer Directory Table
- **Columns**: Name, type badge (`Company`, `Individual`), phone, email, Tax ID, address, actions button.
- **Row Actions**: View Profile & History, Edit Profile, Delete Customer.
- **Global Actions**: **"Add Customer"** button.

#### 2. Form: Customer Registry Entry
- **Inputs**: Name, type select (`Company`, `Individual`), Tax ID, email, phone, physical address textarea.

#### 3. Customer Profile View
- **Details Card**: Contact information.
- **Device Distribution Tabs**:
  - *Currently Dispatched*: List showing currently assigned serial numbers, models, and dispatch dates.
  - *Return History*: List of historically returned hardware serials and dates.

---

### MODULE 8: Reports Console

**Purpose**: Filter and export lifecycle records, stock health data, allocations, and audit logs.

#### 1. Selection Mode (4 Categories)
Toggles the active dataset:
- *Active Inventory*: Hardware statuses and locations.
- *Stock Health*: Stock counts vs targets.
- *Customer Allocations*: Deployed inventory by client.
- *Lifecycle Audits*: chronological timeline of all scanner operations.

#### 2. Console Bar Filters
- *Fuzzy Search Input*: Filters active report records.
- *Dynamic Select Portals*: Renders filter selectors matching the active category:
  - If Inventory: Renders type, status, and customer selectors.
  - If Stock: Renders asset type and stock health level selectors.
  - If Customer: Renders client type selectors.
  - If Audits: Renders operation type selectors.

#### 3. Export Actions & Limits
- **Live Preview Grid**: Displays the top 15 matching records. Shows a notice if additional records exist.
- **Export Formats**:
  - **"CSV"**: Compiles comma-separated text file with UTF-8 encoding.
  - **"Export to Excel"**: Compiles spreadsheet workbook with auto-fit column widths.
  - **Formatting Rule**: Force formatting for long numeric serials, phone numbers, and Tax IDs as text (string values) to prevent Excel from converting them to scientific notation.

---

## 3. Data Validation Rules Matrix

Use this table as the functional guideline for form validation and API payload verification.

| Field | Input Method | Validation Constraints |
| :--- | :--- | :--- |
| **Model Template Name** | Text input | Required, length: `2` to `50` characters |
| **Manufacturer Brand** | Text input | Required, length: `2` to `50` characters |
| **Max Stock Target** | Number input | Integer, minimum: `0` (0 disables alerts) |
| **Barcode Pattern** | Regex text | Must compile to a valid regular expression string |
| **Device Serial (ISN)** | Text / Scan | Required, length: `3` to `40` alphanumeric characters, dashes, or underscores. Must match template regex pattern. |
| **SIM phone (MSISDN)** | Text | Required if template class is SIM card |
| **SIM Carrier** | Text | Required if template class is SIM card |
| **SD Storage Capacity** | Text | Required if template class is SD card |
| **SD Speed Class** | Text | Required if template class is SD card |
| **Client Name** | Text | Required |
| **Client Email** | Text | Must match email address format |
| **Dispatch Customer ID** | Selector | Must be a valid customer UUID |
| **RMA Swap IDs** | Selectors | Old and New device IDs are required and must not be equal |
