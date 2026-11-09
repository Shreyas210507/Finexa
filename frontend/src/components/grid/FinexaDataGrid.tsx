"use client";

import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowClickedEvent, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { useTheme } from "@/components/theme/theme-provider";

// Register all community modules so RowSelection, ColumnFilter, etc. are active
ModuleRegistry.registerModules([AllCommunityModule]);
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface FinexaDataGridProps<TData = object> {
  rowData: TData[];
  columnDefs: ColDef<TData>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (data: TData) => void;
  // Optional custom renderer for mobile card view (< 768px)
  renderMobileCard?: (item: TData, index: number) => React.ReactNode;
  className?: string;
  gridHeight?: string;
}

export function FinexaDataGrid<TData extends object>({
  rowData,
  columnDefs,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries to display at this time.",
  onRowClick,
  renderMobileCard,
  className,
  gridHeight = "440px",
}: FinexaDataGridProps<TData>) {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
  };

  if (loading) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-4 space-y-2">
        <TableRowSkeleton columns={columnDefs.length || 4} />
        <TableRowSkeleton columns={columnDefs.length || 4} />
        <TableRowSkeleton columns={columnDefs.length || 4} />
        <TableRowSkeleton columns={columnDefs.length || 4} />
      </div>
    );
  }

  if (!rowData || rowData.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  // Mobile card view below 768px
  if (isMobile && renderMobileCard) {
    return (
      <div className="space-y-3">
        {rowData.map((item, idx) => (
          <div
            key={(item as { id?: string | number }).id || idx}
            onClick={() => onRowClick && onRowClick(item)}
            className={cn(
              "rounded-[10px] border border-border bg-card p-4 shadow-sm",
              onRowClick && "cursor-pointer active:bg-muted/50"
            )}
          >
            {renderMobileCard(item, idx)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-[10px] border border-border overflow-hidden",
        theme === "dark" ? "ag-theme-finexa-dark ag-theme-quartz-dark" : "ag-theme-finexa-light ag-theme-quartz",
        className
      )}
      style={{ height: gridHeight, width: "100%" }}
    >
      <AgGridReact
        theme="legacy"
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="single"
        onRowClicked={(event: RowClickedEvent<TData>) => {
          if (event.data && onRowClick) {
            onRowClick(event.data);
          }
        }}
        suppressCellFocus={true}
        animateRows={true}
      />
    </div>
  );
}
