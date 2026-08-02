'use client';

import React from 'react';
import { Toaster, toast } from 'sonner';
import { useWebsocket } from '../../hooks/use-websocket';

export function RealtimeToaster() {
  useWebsocket({
    onInvoicePaid: (data) => {
      toast.success('Invoice Paid', {
        description: `Invoice ${data.invoiceId} has been successfully paid by the customer.`,
      });
    },
    onEstimateSigned: (data) => {
      toast.success('Estimate Accepted', {
        description: `Estimate ${data.estimateId} was digitally signed by the customer!`,
      });
    },
    onJobStatusChanged: (data) => {
      toast.info('Job Status Updated', {
        description: `Job ${data.jobId} was moved to ${data.newStatus}.`,
      });
    },
  });

  return <Toaster position="top-right" richColors />;
}
