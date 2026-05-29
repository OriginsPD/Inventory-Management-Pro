# IMS Pro Application Guide

IMS Pro is an inventory and operations application for managing hardware assets such as GPS trackers, SIM cards, SD cards, panic buttons, key fobs, dash cameras, and related peripherals. It is built for warehouse and fleet operations teams that need to register devices, organize device relationships, dispatch stock to customers, run quality checks, track swaps or returns, and review operational history.

This guide explains what the application does and how to use the main workflows in its current state.

## What IMS Pro Does

IMS Pro provides a secure web interface for:

- Tracking physical device inventory.
- Creating device model templates and classification rules.
- Registering individual devices or bulk-ingesting scanned identifiers.
- Linking devices into parent/child relationships, such as a tracker with a SIM or accessory.
- Dispatching devices to customers.
- Running QC checks and recording test outcomes.
- Managing hardware replacements and RMA-style swaps.
- Managing customers.
- Viewing dashboard metrics, reports, audit logs, and stock health.
- Managing users and roles when signed in as a super user.

The application is split into a frontend web app and a backend API. Operators use the frontend in a browser. The backend stores data in PostgreSQL when database mode is configured.

## Primary Users

IMS Pro supports three application roles:

- `SUPER_USER`: administrator role. Can manage users, model templates, and operational records.
- `TECHNICIAN`: operational role. Can perform most inventory, dispatch, QC, linking, and swap actions.
- `REVIEWER`: read-oriented role. Can view data but is restricted from most mutating workflows.

Some screens may be visible to all signed-in users, but backend authorization still controls whether a user can perform write operations.

## Getting Into The Application

1. Open the frontend URL, normally `http://localhost:5173` in local development.
2. Go to `/login` or select the login entry point from the landing page.
3. Enter the operator email and password.
4. After login, the app opens the protected workspace and loads the dashboard.

Sessions are cookie-based. If the session expires or the backend returns `401`, the frontend clears the local session and sends the user back through authentication.

## Main Navigation

After login, the left sidebar groups the application into two areas.

Operations:

- Dashboard
- Inventory
- Dispatch
- QC Bench

Management:

- Users, visible to `SUPER_USER`
- Model Templates
- RMA Swaps
- Customers
- Reports
- Settings

The top bar shows the signed-in user, their role, and stock health status when stock targets are configured.

## Dashboard

The dashboard is the operational overview. It summarizes:

- Total hardware count.
- Active dispatched devices.
- Devices in testing.
- Ready stock.
- QC pass-rate display.
- Activity velocity for dispatches and ingestions.
- Asset class breakdown.
- Model stock health.
- Recent operations.

Use the dashboard first when checking system health, stock levels, and recent warehouse activity.

## Inventory

The Inventory screen is the central device management workspace.

Main capabilities:

- View devices in a paginated table.
- Search by identifier.
- Filter by status and model.
- Sort table columns.
- Show or hide columns.
- Open device details.
- Add a single device.
- Perform bulk operations.
- Select devices for bulk deletion.
- Manage links between devices.
- Buffer scanned devices locally while offline and sync them when connectivity returns.

For users with write access, the screen supports both single-entry and bulk-ingest workflows. A physical scanner can trigger bulk entry when the app detects scanned barcode input.

Typical single device entry:

1. Open `Inventory`.
2. Select `Single Entry`.
3. Enter or scan the identifier.
4. Choose the model.
5. Save the device.

Typical bulk entry:

1. Open `Inventory`.
2. Select `Bulk Operations`.
3. Scan or paste multiple identifiers.
4. Review detected items.
5. Submit the batch.

If the browser is offline, pending inventory items can be stored locally and synchronized later.

## Model Templates

Model Templates define the available hardware types and their rules.

A model template can include:

- Model name.
- Brand or manufacturer.
- Asset classification.
- Allowed child asset types.
- Maximum stock target.
- Optional identifier pattern for validating or classifying scanned identifiers.

Model templates drive inventory organization and relationship validation. For example, a tracker model can be configured to accept SIM cards or other specific child components.

Users need `SUPER_USER` access to manage model templates.

## Device Linking

IMS Pro supports parent/child device relationships.

Examples:

- Tracker linked to SIM.
- Tracker linked to SD card.
- Tracker linked to panic button or key fob.

Use linking when multiple physical components should move together operationally. The backend includes safeguards for relationship traversal and ancestor checks so devices cannot be linked into invalid recursive structures.

Typical linking workflow:

1. Open `Inventory`.
2. Select a device.
3. Open link management for that device.
4. Choose eligible child devices.
5. Save the relationship.

## Dispatch

The Dispatch screen is used to assign devices to customers and move stock out of available inventory.

Typical dispatch workflow:

1. Open `Dispatch`.
2. Select the customer.
3. Scan or enter device identifiers.
4. Review the staged list.
5. Execute the dispatch.

When devices have linked children, dispatch-related backend logic can cascade status and customer metadata through the relationship tree so linked components stay operationally aligned.

## QC Bench

The QC Bench is used for quality-control checks.

Typical QC workflow:

1. Open `QC Bench`.
2. Scan or enter a device identifier.
3. Record test results.
4. Mark the device as passed or failed.
5. Save the QC record.

QC outcomes update device state and write operational history.

## RMA Swaps

The RMA Swaps screen supports hardware replacement workflows.

Typical swap workflow:

1. Open `RMA Swaps`.
2. Identify the old or faulty device.
3. Identify the replacement device.
4. Confirm the customer or operational context.
5. Commit the swap.

The application records audit history so replacements can be traced later.

## Customers

The Customers screen manages customer records used for dispatch and returns.

Customer data can include:

- Name.
- Customer type.
- Phone.
- Email.
- Address.
- Tax ID.
- Additional metadata.

Customer records provide the assignment target for dispatched devices and customer-specific operational history.

## Reports

The Reports screen provides access to summarized operational information. It is intended for reviewing inventory and activity data rather than performing day-to-day device edits.

Use reports when you need a higher-level view of operational state beyond the live dashboard.

## Users And Profiles

The Users screen is available to `SUPER_USER` accounts. It supports user management for the application.

The Profile screen is available to signed-in users and supports:

- Viewing user identity and role.
- Reviewing personal audit activity.
- Updating profile name.
- Changing password.

Password changes require the current password.

## Audit History

IMS Pro records operational events such as inventory ingestion, linking, deletion, status changes, customer changes, dispatches, returns, swaps, and QC-related actions.

Audit records can be viewed in several places:

- Dashboard recent operations.
- System audit logs.
- Device-specific audit history.
- User profile personal activity.
- Customer return history.

Audit logs are part of the operational record and should be treated as compliance-relevant data.

## Stock Health

Model templates can define a maximum stock target. When configured, the application can calculate stock health by comparing current in-stock device counts against that target.

The app surfaces stock health through:

- Dashboard model stock table.
- Sidebar/top-bar alert indicators.
- Stock alert API data.

Targets are optional. Models without targets do not produce meaningful low-stock alerts.

## Operating Notes

- Use model templates before large inventory imports so devices are classified consistently.
- Keep device identifiers unique and aligned with scanner labels or barcodes.
- Use linking for physical bundles that should move together.
- Review staged dispatch and bulk-ingest data before committing.
- Treat offline inventory buffering as temporary; sync as soon as the connection returns.
- Use role assignment carefully. `SUPER_USER` has administrative control.
- Bootstrap admin credentials are setup-time configuration and should not be documented in plaintext.

## Related Documentation

- [Architecture](architecture.md)
