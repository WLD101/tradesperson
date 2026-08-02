'use client';

import React, { useState } from 'react';
import { Button } from '@tradesperson/ui';

export const BillingPortalButton = () => {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleOpenPortal} disabled={loading} className="w-full sm:w-auto bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300">
      {loading ? 'Opening...' : 'Manage Billing & Payment Methods'}
    </Button>
  );
};
