import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultTradeDraft, type TradeDraft } from '../lib/tradeDraft';

interface TradeDraftCtx {
  draft: TradeDraft;
  setDraft: (patch: Partial<TradeDraft> | ((d: TradeDraft) => TradeDraft)) => void;
  resetDraft: () => void;
}

const Ctx = createContext<TradeDraftCtx | null>(null);

export function TradeDraftProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [draft, setDraftState] = useState<TradeDraft>(() => defaultTradeDraft());

  const setDraft = useCallback((patch: Partial<TradeDraft> | ((d: TradeDraft) => TradeDraft)) => {
    setDraftState((d) => (typeof patch === 'function' ? patch(d) : { ...d, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState(defaultTradeDraft());
  }, []);

  const value = useMemo(() => ({ draft, setDraft, resetDraft }), [draft, setDraft, resetDraft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTradeDraft(): TradeDraftCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTradeDraft outside TradeDraftProvider');
  return v;
}
