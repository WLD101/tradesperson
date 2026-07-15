"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@tradesperson/ui";

export default function SiteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [siteId, setSiteId] = useState<string>("");
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    label: "",
    siteType: "",
    addressLine1: "",
    city: "",
    postcode: "",
    accessNotes: "",
  });

  useEffect(() => {
    params.then((p) => {
      setSiteId(p.id);
      fetch(`/api/v1/sites/${p.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load site");
          return res.json();
        })
        .then((data) => {
          setSite(data.data);
          setFormData({
            label: data.data.label || "",
            siteType: data.data.siteType || "",
            addressLine1: data.data.addressLine1 || "",
            city: data.data.city || "",
            postcode: data.data.postcode || "",
            accessNotes: data.data.accessNotes || "",
          });
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to update site");
      }

      router.push(`/app/crm/sites/${siteId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Loading site details...</div>;
  if (!site) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href={`/app/crm/sites/${siteId}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          &larr; Back to Site
        </Link>
      </div>

      <Card>
        <h1 className="text-2xl font-semibold text-slate-950 mb-6">Edit Site</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Label
            </label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Type
            </label>
            <Input
              value={formData.siteType}
              onChange={(e) => setFormData({ ...formData, siteType: e.target.value })}
              placeholder="e.g. RESIDENTIAL, COMMERCIAL"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address Line 1
              </label>
              <Input
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Postcode
              </label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Access Notes
            </label>
            <Input
              value={formData.accessNotes}
              onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200"
              onClick={() => router.push(`/app/crm/sites/${siteId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
