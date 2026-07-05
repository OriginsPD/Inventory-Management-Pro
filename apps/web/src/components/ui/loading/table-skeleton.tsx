import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ims_pro/ui/components/table";
import { cn } from "@/lib/utils";

import { SkeletonBlock } from "./skeleton-block";

export interface TableSkeletonColumn {
  width?: string;
  align?: "left" | "right" | "center";
  type?: "text" | "badge" | "icon" | "status";
}

interface TableSkeletonProps {
  rows?: number;
  columns?: TableSkeletonColumn[];
  showCheckbox?: boolean;
  showHeader?: boolean;
  bodyOnly?: boolean;
  className?: string;
  wrapped?: boolean;
}

const defaultColumns: TableSkeletonColumn[] = [
  { width: "w-28" },
  { width: "w-24" },
  { width: "w-20", type: "badge" },
  { width: "w-16", type: "status" },
  { width: "w-32" },
  { width: "w-8", align: "right", type: "icon" },
];

function SkeletonCell({ col }: { col: TableSkeletonColumn }) {
  if (col.type === "status") {
    return (
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-2 w-2 rounded-full" />
        <SkeletonBlock variant="text" className={cn("h-3.5", col.width ?? "w-16")} />
      </div>
    );
  }
  if (col.type === "badge") {
    return <SkeletonBlock variant="badge" className={col.width} />;
  }
  if (col.type === "icon") {
    return <SkeletonBlock variant="icon" className={cn("ml-auto", col.width)} />;
  }
  return <SkeletonBlock variant="text" className={col.width} />;
}

export function TableSkeleton({
  rows = 5,
  columns = defaultColumns,
  showCheckbox = false,
  showHeader = true,
  bodyOnly = false,
  className,
  wrapped = true,
}: TableSkeletonProps) {
  const rowsContent = Array.from({ length: rows }).map((_, rowIndex) => (
    <TableRow key={rowIndex}>
      {showCheckbox && (
        <TableCell className="w-[40px] px-4">
          <SkeletonBlock className="h-4 w-4" />
        </TableCell>
      )}
      {columns.map((col, colIndex) => (
        <TableCell
          key={colIndex}
          className={cn(
            col.align === "right" && "text-right",
            col.align === "center" && "text-center",
          )}
        >
          <SkeletonCell col={col} />
        </TableCell>
      ))}
    </TableRow>
  ));

  if (bodyOnly) {
    return <>{rowsContent}</>;
  }

  const table = (
    <Table>
      {showHeader && (
        <TableHeader>
          <TableRow>
            {showCheckbox && (
              <TableHead className="w-[40px] px-4">
                <SkeletonBlock className="h-4 w-4" />
              </TableHead>
            )}
            {columns.map((col, i) => (
              <TableHead key={i}>
                <SkeletonBlock variant="text" className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>{rowsContent}</TableBody>
    </Table>
  );

  if (!wrapped) return <div className={className}>{table}</div>;

  return (
    <div className={cn("glass-panel rounded-xl overflow-hidden", className)}>
      {table}
    </div>
  );
}
