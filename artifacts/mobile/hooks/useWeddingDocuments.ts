type WeddingDocument = {
  id: number;
  entityType: string;
  entityId: number | null;
  name: string;
  objectPath: string;
  contentType: string | null;
  size: number | null;
  createdAt: string;
};

export const getWeddingDocumentsQueryKey = (weddingId: number) =>
  [`/api/weddings/${weddingId}/documents`] as const;

export function getWeddingDocumentsQueryOptions(
  weddingId: number,
  getToken: () => Promise<string | null>,
) {
  return {
    queryKey: getWeddingDocumentsQueryKey(weddingId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<WeddingDocument[]> => {
      const token = await getToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : '';
      const response = await fetch(`${base}/api/weddings/${weddingId}/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Unable to load wedding documents');
      return response.json() as Promise<WeddingDocument[]>;
    },
  };
}
