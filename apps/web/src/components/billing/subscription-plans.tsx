'use client';

import React, { useState } from 'react';
import { Button, Card } from '@tradesperson/ui';

const STRIPE_PRICE_ID_PRO = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_123';

export const SubscriptionPlans = () => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID_PRO,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate upgrade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Card className="p-6 flex flex-col items-center">
        <h3 className="text-xl font-bold mb-2">Free Tier</h3>
        <p className="text-sm text-slate-500 mb-6 text-center">Perfect for solo tradespeople just getting started.</p>
        <div className="text-3xl font-bold mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
        <ul className="mb-8 space-y-2 text-sm text-slate-600 text-left w-full">
          <li>✔ Up to 10 Jobs per month</li>
          <li>✔ Basic Invoicing</li>
          <li>✔ 1 User</li>
        </ul>
        <Button disabled className="w-full mt-auto">Current Plan</Button>
      </Card>

      <Card className="p-6 flex flex-col items-center border-blue-500 shadow-md">
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">RECOMMENDED</div>
        <h3 className="text-xl font-bold mb-2">Pro Tier</h3>
        <p className="text-sm text-slate-500 mb-6 text-center">For growing trade businesses looking for full control.</p>
        <div className="text-3xl font-bold mb-6">$49<span className="text-sm font-normal text-slate-500">/mo</span></div>
        <ul className="mb-8 space-y-2 text-sm text-slate-600 text-left w-full">
          <li>✔ Unlimited Jobs</li>
          <li>✔ Stripe Customer Payments</li>
          <li>✔ Unlimited Users</li>
        </ul>
        <Button onClick={handleUpgrade} disabled={loading} className="w-full mt-auto bg-blue-600 hover:bg-blue-700">
          {loading ? 'Processing...' : 'Upgrade to Pro'}
        </Button>
      </Card>
    </div>
  );
};
