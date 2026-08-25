import { getListWeddingsQueryKey, useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';

export const MOBILE_TAB_STALE_TIME = 5 * 60 * 1000;

/**
 * Shares the current wedding selection and keeps its list cache warm across tabs.
 * A persisted selection can start the tab query immediately, without waiting for
 * the wedding-list request to resolve.
 */
export function useActiveWedding() {
  const { selectedWeddingId } = useWedding();
  const weddingsQuery = useListWeddings({
    query: {
      queryKey: getListWeddingsQueryKey(),
      staleTime: MOBILE_TAB_STALE_TIME,
      gcTime: 30 * 60 * 1000,
    },
  });
  const weddings = weddingsQuery.data;
  const selectedId = selectedWeddingId && selectedWeddingId > 0 ? selectedWeddingId : null;
  const selectedExists = selectedId !== null && (weddings === undefined || weddings.some((wedding) => wedding.id === selectedId));
  const weddingId = selectedExists ? selectedId : weddings?.[0]?.id ?? null;
  const activeWedding = weddings?.find((wedding) => wedding.id === weddingId) ?? weddings?.[0];

  return {
    ...weddingsQuery,
    weddings,
    activeWedding,
    weddingId,
  };
}