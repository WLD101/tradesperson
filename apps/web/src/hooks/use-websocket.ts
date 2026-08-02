import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type WebsocketHookOptions = {
  url?: string;
  onInvoicePaid?: (data: { invoiceId: string }) => void;
  onEstimateSigned?: (data: { estimateId: string }) => void;
  onJobStatusChanged?: (data: { jobId: string, newStatus: string }) => void;
};

export const useWebsocket = (options: WebsocketHookOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Determine WS URL (fallback to API URL)
    const wsUrl = options.url || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Initialize socket connection
    // We rely on withCredentials to send the tp_session cookie during handshake
    const socket = io(`${wsUrl}/v1/events`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Register event listeners
    if (options.onInvoicePaid) {
      socket.on('invoice.paid', options.onInvoicePaid);
    }
    if (options.onEstimateSigned) {
      socket.on('estimate.signed', options.onEstimateSigned);
    }
    if (options.onJobStatusChanged) {
      socket.on('job.status.changed', options.onJobStatusChanged);
    }

    return () => {
      socket.disconnect();
    };
  }, [options.url]); // Note: In a real app we might memoize the callbacks or use a ref for them.

  return {
    socket: socketRef.current,
    isConnected,
  };
};
