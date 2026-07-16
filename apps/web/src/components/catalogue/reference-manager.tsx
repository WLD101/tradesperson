"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@tradesperson/ui";
import { ClientApiError, clientApiFetch } from "@/lib/client-api";
import type { LookupRecord } from "@/lib/catalogue";

type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type Props = {
  title: string;
  description: string;
  apiBasePath: string;
  fields: FieldConfig[];
  records: LookupRecord[];
  canManage: boolean;
  canArchive: boolean;
};

function toFormState(fields: FieldConfig[], record?: LookupRecord) {
  return Object.fromEntries(
    fields.map((field) => {
      const rawValue =
        record && typeof (record as Record<string, unknown>)[field.key] === "object"
          ? ((record as Record<string, unknown>)[field.key] as { id?: string } | null)
              ?.id ?? ""
          : ((record as Record<string, unknown> | undefined)?.[field.key] as
              | string
              | undefined
              | null) ?? "";
      return [field.key, rawValue];
    }),
  ) as Record<string, string>;
}

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

export function ReferenceManager({
  title,
  description,
  apiBasePath,
  fields,
  records,
  canManage,
  canArchive,
}: Props) {
  const [items, setItems] = useState(records);
  const [createForm, setCreateForm] = useState<Record<string, string>>(
    toFormState(fields),
  );
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<Record<string, string>>(
    toFormState(fields),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateForm(
    target: "create" | "edit",
    key: string,
    value: string,
  ) {
    if (target === "create") {
      setCreateForm((current) => ({ ...current, [key]: value }));
      return;
    }

    setEditForm((current) => ({ ...current, [key]: value }));
  }

  async function createRecord() {
    setError("");
    setMessage("");

    try {
      const payload = Object.fromEntries(
        Object.entries(createForm).map(([key, value]) => [key, value.trim() || null]),
      );
      const created = await clientApiFetch<LookupRecord>(apiBasePath, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setItems((current) => [...current, created]);
      setCreateForm(toFormState(fields));
      setMessage(`${title.slice(0, -1)} created.`);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function saveRecord(id: string) {
    setError("");
    setMessage("");

    try {
      const payload = Object.fromEntries(
        Object.entries(editForm).map(([key, value]) => [key, value.trim() || null]),
      );
      const updated = await clientApiFetch<LookupRecord>(`${apiBasePath}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setEditingId("");
      setMessage(`${title.slice(0, -1)} updated.`);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function toggleArchive(record: LookupRecord) {
    setError("");
    setMessage("");
    try {
      const action = record.status === "ARCHIVED" ? "restore" : "archive";
      const updated = await clientApiFetch<LookupRecord>(
        `${apiBasePath}/${record.id}/${action}`,
        {
          method: "PATCH",
        },
      );
      setItems((current) =>
        current.map((item) => (item.id === record.id ? updated : item)),
      );
      setMessage(
        record.status === "ARCHIVED"
          ? `${title.slice(0, -1)} restored.`
          : `${title.slice(0, -1)} archived.`,
      );
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <p className="text-sm text-slate-500">{items.length} total</p>
        </div>

        {message ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {items.length ? (
            items.map((record) => {
              const editing = editingId === record.id;
              return (
                <div
                  key={record.id}
                  className="rounded-xl border border-slate-200 px-4 py-4"
                >
                  {editing ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          className={
                            field.type === "textarea" ? "md:col-span-2" : ""
                          }
                        >
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {field.label}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                              value={editForm[field.key] ?? ""}
                              onChange={(event) =>
                                updateForm("edit", field.key, event.target.value)
                              }
                            />
                          ) : field.type === "select" ? (
                            <select
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                              value={editForm[field.key] ?? ""}
                              onChange={(event) =>
                                updateForm("edit", field.key, event.target.value)
                              }
                            >
                              <option value="">Not set</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={editForm[field.key] ?? ""}
                              onChange={(event) =>
                                updateForm("edit", field.key, event.target.value)
                              }
                            />
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-2 flex justify-end gap-3">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => setEditingId("")}
                        >
                          Cancel
                        </button>
                        <Button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(() => {
                              void saveRecord(record.id);
                            });
                          }}
                        >
                          {isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-slate-900">
                            {record.name}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              record.status === "ARCHIVED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {record.slug ?? record.code ?? "No code"}{" "}
                          {record.symbol ? `• ${record.symbol}` : ""}
                          {record.kind ? `• ${record.kind}` : ""}
                        </p>
                        {record.manufacturer ? (
                          <p className="text-sm text-slate-500">
                            Manufacturer: {record.manufacturer.name}
                          </p>
                        ) : null}
                        {record.brand ? (
                          <p className="text-sm text-slate-500">
                            Brand: {record.brand.name}
                          </p>
                        ) : null}
                        {record.description ? (
                          <p className="text-sm text-slate-600">
                            {record.description}
                          </p>
                        ) : null}
                      </div>
                      {canManage || canArchive ? (
                        <div className="flex items-center gap-2">
                          {canManage ? (
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setEditingId(record.id);
                                setEditForm(toFormState(fields, record));
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canArchive ? (
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                startTransition(() => {
                                  void toggleArchive(record);
                                });
                              }}
                            >
                              {record.status === "ARCHIVED" ? "Restore" : "Archive"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              No records have been created yet.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add record</h2>
        <p className="mt-1 text-sm text-slate-500">
          Keep this phase functional and replaceable. Final styling comes later.
        </p>
        {!canManage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have view access only for this catalogue area.
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(() => {
                void createRecord();
              });
            }}
          >
            {fields.map((field) =>
              field.type === "textarea" ? (
                <div key={field.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    value={createForm[field.key] ?? ""}
                    onChange={(event) =>
                      updateForm("create", field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ) : field.type === "select" ? (
                <div key={field.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    value={createForm[field.key] ?? ""}
                    onChange={(event) =>
                      updateForm("create", field.key, event.target.value)
                    }
                  >
                    <option value="">Not set</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div key={field.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <Input
                    required={field.required}
                    value={createForm[field.key] ?? ""}
                    onChange={(event) =>
                      updateForm("create", field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ),
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
