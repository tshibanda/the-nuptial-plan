import { createContext, useContext, useState, ReactNode } from 'react';

interface WeddingContextValue {
  activeWeddingId: number | null;
  setActiveWeddingId: (id: number | null) => void;
}

const WeddingContext = createContext<WeddingContextValue | undefined>(undefined);

export function WeddingProvider({ children }: { children: ReactNode }) {
  const [activeWeddingId, setActiveWeddingId] = useState<number | null>(null);

  return (
    <WeddingContext.Provider value={{ activeWeddingId, setActiveWeddingId }}>
      {children}
    </WeddingContext.Provider>
  );
}

export function useActiveWedding() {
  const context = useContext(WeddingContext);
  if (context === undefined) {
    throw new Error('useActiveWedding must be used within a WeddingProvider');
  }
  return context;
}
