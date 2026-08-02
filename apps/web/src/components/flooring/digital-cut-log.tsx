'use client';

import React, { useState } from 'react';
import { Scissors, Check, AlertCircle } from 'lucide-react';
import { Button, Input } from '@tradesperson/ui';

interface DigitalCutLogProps {
  rollId: string;
  jobId: string;
  currentLengthFt: number;
  dyeLotNumber: string;
  onCutLogged?: () => void;
}

export const DigitalCutLog: React.FC<DigitalCutLogProps> = ({
  rollId,
  jobId,
  currentLengthFt,
  dyeLotNumber,
  onCutLogged,
}) => {
  const [cutLength, setCutLength] = useState<string>('');
  const [wasteLength, setWasteLength] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExecuteCut = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/flooring/roll-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollId,
          jobId,
          cutLengthFt: parseFloat(cutLength),
          wasteLengthFt: parseFloat(wasteLength || '0'),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to log roll cut.');

      setMessage({ type: 'success', text: `Cut logged! New Balance: ${data.remainingBalanceFt} ft` });
      setCutLength('');
      if (onCutLogged) onCutLogged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b mb-4">
        <div>
          <h4 className="font-bold flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" /> Digital Cut Register
          </h4>
          <p className="text-xs text-muted-foreground">Dye Lot: <span className="font-mono">{dyeLotNumber}</span></p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Available Roll Length</span>
          <p className="text-lg font-bold text-primary">{currentLengthFt} ft</p>
        </div>
      </div>

      <form onSubmit={handleExecuteCut} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Cut Length (Ft)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 15.5"
              onChange={(e: any) => setCutLength(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Waste/Offcut (Ft)</label>
            <Input
              type="number"
              onChange={(e: any) => setWasteLength(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className={`p-2 rounded text-xs flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {message.text}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing Cut...' : 'Log Cut & Update Balance'}
        </Button>
      </form>
    </div>
  );
};
