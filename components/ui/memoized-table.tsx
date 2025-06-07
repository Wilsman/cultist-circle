// components/ui/memoized-table.tsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell as OriginalTableCell,
  TableHead,
  TableHeader,
  TableRow as OriginalTableRow,
} from "@/components/ui/table";

// Memoized version of TableRow
export const TableRow = React.memo(OriginalTableRow);

// Memoized version of TableCell
export const TableCell = React.memo(OriginalTableCell);

// Re-export the other components
export { Table, TableBody, TableHead, TableHeader };
