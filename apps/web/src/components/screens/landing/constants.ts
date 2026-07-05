export const featureCards = [
  {
    icon: "inventory_2",
    title: "Live Device Inventory",
    description:
      "Track serials, asset classes, stock status, linked components, and assignment history from one operational view.",
    span: "md:col-span-7 md:row-span-2",
  },
  {
    icon: "local_shipping",
    title: "Customer Dispatch",
    description:
      "Stage devices for customers, manage returns, and keep dispatch activity tied to customer records.",
    span: "md:col-span-5",
  },
  {
    icon: "biotech",
    title: "QC Bench",
    description:
      "Run technician checks, capture pass or fail outcomes, and maintain hardware lifecycle visibility.",
    span: "md:col-span-5",
  },
  {
    icon: "analytics",
    title: "Reports and Audit Trails",
    description:
      "Export inventory, stock health, customer allocation, and technician activity reports for review.",
    span: "md:col-span-7",
  },
] as const;

export const workflowStats = [
  { value: "3", label: "Operator roles" },
  { value: "9", label: "Asset classes" },
  { value: "4", label: "Core workflows" },
] as const;

export const statusCards = [
  { status: "IN_STOCK", progress: 72, dot: "bg-emerald-400" },
  { status: "DISPATCHED", progress: 59, dot: "bg-sky-400" },
  { status: "TESTING", progress: 46, dot: "bg-amber-400" },
  { status: "RMA", progress: 33, dot: "bg-red-400" },
] as const;

export const workflowSteps = [
  {
    icon: "inventory_2",
    title: "Receive & Ingest",
    description: "Scan serials, link child assets, and default stock status on intake.",
  },
  {
    icon: "biotech",
    title: "QC & Validate",
    description: "Run diagnostic checklists and capture pass or fail outcomes per device.",
  },
  {
    icon: "local_shipping",
    title: "Dispatch & Track",
    description: "Stage devices, assign to customers, and maintain full movement history.",
  },
  {
    icon: "sync",
    title: "RMA & Swap",
    description: "Handle returns and atomic hardware swaps with persistent audit logs.",
  },
] as const;

export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
] as const;
