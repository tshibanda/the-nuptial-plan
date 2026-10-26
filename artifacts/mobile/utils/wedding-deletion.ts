import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Wedding } from '@workspace/api-client-react';

export interface WeddingDeletionContext {
  wedding?: Wedding;
  index: number;
  previousSelection: number | null;
  nextSelection: number | null;
}

interface DeletionOptions {
  queryClient: QueryClient;
  queryKey: QueryKey;
  getSelection: () => number | null;
  selectWedding: (id: number) => void;
  showError: () => void;
}

// Keep optimistic changes reversible without restoring an outdated list snapshot.
export function createWeddingDeletionLifecycle(options: DeletionOptions) {
  const { queryClient, queryKey, getSelection, selectWedding, showError } = options;
  return {
    onMutate: async ({ id }: { id: number }): Promise<WeddingDeletionContext> => {
      await queryClient.cancelQueries({ queryKey });
      const current = queryClient.getQueryData<Wedding[]>(queryKey) ?? [];
      const index = current.findIndex((wedding) => wedding.id === id);
      const wedding = current[index];
      const remaining = current.filter((entry) => entry.id !== id);
      const previousSelection = getSelection();
      const nextSelection = previousSelection === id ? remaining[0]?.id ?? 0 : previousSelection;
      if (wedding) {
        queryClient.setQueryData(queryKey, remaining);
        if (previousSelection === id) selectWedding(nextSelection ?? 0);
      }
      return { wedding, index, previousSelection, nextSelection };
    },
    onError: (_error: unknown, { id }: { id: number }, context?: WeddingDeletionContext) => {
      if (context?.wedding) {
        const wedding = context.wedding;
        queryClient.setQueryData<Wedding[]>(queryKey, (current = []) => {
          if (current.some((entry) => entry.id === id)) return current;
          const restored = [...current];
          restored.splice(Math.min(context.index, restored.length), 0, wedding);
          return restored;
        });
        // Do not undo a different wedding the user selected while waiting.
        if (context.previousSelection === id && getSelection() === context.nextSelection) {
          selectWedding(id);
        }
      }
      showError();
    },
    onSuccess: (_data: unknown, { id }: { id: number }) => {
      const path = `/api/weddings/${id}`;
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key === path || key.startsWith(`${path}/`));
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}
