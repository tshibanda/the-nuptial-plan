import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeddingContextValue {
  selectedWeddingId: number | null;
  selectWedding: (id: number) => void;
}

const WeddingContext = createContext<WeddingContextValue>({
  selectedWeddingId: null,
  selectWedding: () => {},
});

const STORAGE_KEY = '@nuptial/selectedWeddingId';

export function WeddingProvider({ children }: { children: React.ReactNode }) {
  const [selectedWeddingId, setSelectedWeddingId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => { if (val != null) setSelectedWeddingId(Number(val)); })
      .catch(() => {});
  }, []);

  const selectWedding = useCallback((id: number) => {
    setSelectedWeddingId(id);
    AsyncStorage.setItem(STORAGE_KEY, String(id)).catch(() => {});
  }, []);

  return (
    <WeddingContext.Provider value={{ selectedWeddingId, selectWedding }}>
      {children}
    </WeddingContext.Provider>
  );
}

export function useWedding() {
  return useContext(WeddingContext);
}
