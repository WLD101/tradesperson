"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import type { ProductRecord } from "@/lib/catalogue";

const columnHelper = createColumnHelper<ProductRecord>();

const columns = [
  columnHelper.accessor("name", {
    header: "Product",
    cell: (info) => (
      <div>
        <p className="font-medium text-slate-900">{info.getValue()}</p>
        <p className="text-xs text-slate-500">{info.row.original.sku}</p>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.category.name, {
    id: "category",
    header: "Category",
  }),
  columnHelper.accessor((row) => row.brand?.name ?? "No brand", {
    id: "brand",
    header: "Brand",
  }),
  columnHelper.accessor((row) => row.primaryUnit.code, {
    id: "unit",
    header: "Unit",
  }),
  columnHelper.accessor("lifecycleStatus", {
    header: "Status",
    cell: (info) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
          info.getValue() === "ARCHIVED"
            ? "bg-amber-100 text-amber-800"
            : info.getValue() === "DISCONTINUED"
              ? "bg-slate-200 text-slate-800"
              : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.variants.length, {
    id: "variants",
    header: "Variants",
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex items-center gap-3">
        <Link
          href={`/app/catalogue/products/${info.row.original.id}`}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          View
        </Link>
        <Link
          href={`/app/catalogue/products/${info.row.original.id}/edit`}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          Edit
        </Link>
      </div>
    ),
  }),
];

export function ProductsTable({ items }: { items: ProductRecord[] }) {
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
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
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
