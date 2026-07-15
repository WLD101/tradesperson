import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

export default async function SubscriptionPage() {
  const subscription = await apiFetch<{
    status: string;
    plan: { name: string; description: string };
  } | null>("/api/v1/subscriptions/current");

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-950">Subscription</h1>
      {subscription ? (
        <div className="mt-4 space-y-2">
          <p className="text-lg font-medium text-slate-900">
            {subscription.plan.name}
          </p>
          <p className="text-sm text-slate-600">
            {subscription.plan.description}
          </p>
          <p className="text-sm text-slate-500">
            Status: {subscription.status}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No active subscription found.
        </p>
      )}
    </Card>
  );
}
