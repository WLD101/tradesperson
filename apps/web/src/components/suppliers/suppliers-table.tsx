"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import type { SupplierRecord } from "@/lib/suppliers";

const columnHelper = createColumnHelper<SupplierRecord>();

const columns = [
  columnHelper.accessor("legalName", {
    header: "Supplier",
    cell: (info) => (
      <div>
        <p className="font-medium text-slate-900">{info.getValue()}</p>
        <p className="text-xs text-slate-500">{info.row.original.supplierCode}</p>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.contacts[0]?.name ?? "No primary contact", {
    id: "primaryContact",
    header: "Primary contact",
  }),
  columnHelper.accessor("typicalLeadTimeDays", {
    header: "Lead time",
    cell: (info) => (info.getValue() == null ? "Not set" : `${info.getValue()} days`),
  }),
  columnHelper.accessor("preferredSupplier", {
    header: "Preferred",
    cell: (info) => (info.getValue() ? "Yes" : "No"),
  }),
  columnHelper.accessor("status", {
    header: "Status",
  }),
  columnHelper.accessor((row) => row._count.supplierProducts, {
    id: "products",
    header: "Products",
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex items-center gap-3">
        <Link
          href={`/app/suppliers/${info.row.original.id}`}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          View
        </Link>
        <Link
          href={`/app/suppliers/${info.row.original.id}/edit`}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          Edit
        </Link>
      </div>
    ),
  }),
];

export function SuppliersTable({ items }: { items: SupplierRecord[] }) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="rounded-xl bg-slate-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-y border-slate-200 px-3 py-3 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
