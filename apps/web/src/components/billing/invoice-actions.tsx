'use client';

import React, { useState } from 'react';
import { Button } from '@tradesperson/ui';

interface InvoiceActionsProps {
  invoiceId: string;
  isPaid: boolean;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({ invoiceId, isPaid }) => {
  const [loading, setLoading] = useState(false);

  const handlePayWithStripe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/invoice/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          successUrl: `${window.location.origin}/invoices/${invoiceId}?success=true`,
          cancelUrl: `${window.location.origin}/invoices/${invoiceId}?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Failed to initialize payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error initiating checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/invoices/${invoiceId}`;
    navigator.clipboard.writeText(url);
    alert('Payment link copied to clipboard!');
  };

  if (isPaid) {
    return (
      <div className="flex gap-3 mt-4">
        <span className="text-green-600 font-bold flex items-center">✓ PAID</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mt-4">
      <Button onClick={handleCopyLink} className="bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300">
        Copy Link
      </Button>
      <Button onClick={handlePayWithStripe} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
        {loading ? 'Processing...' : 'Pay with Stripe'}
      </Button>
    </div>
  );
};
