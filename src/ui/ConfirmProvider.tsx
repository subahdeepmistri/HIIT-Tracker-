import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type ConfirmRequest, registerConfirmHost } from './confirm';
import { ConfirmCard } from './components/ConfirmCard';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const pending = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    pending.current?.(value);
    pending.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((next: ConfirmRequest) => {
    pending.current?.(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setRequest(next);
    });
  }, []);

  useEffect(() => {
    registerConfirmHost(confirm);
    return () => registerConfirmHost(null);
  }, [confirm]);

  return (
    <>
      {children}
      <ConfirmCard request={request} onCancel={() => close(false)} onConfirm={() => close(true)} />
    </>
  );
}
