import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

export interface WeddingDocument {
  id: number;
  weddingId: number;
  entityType: string;
  entityId: number | null;
  name: string;
  objectPath: string;
  contentType: string | null;
  size: number | null;
  createdAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const API = `${BASE}/api`;

function docKey(weddingId: number, entityType?: string, entityId?: number) {
  return ['documents', weddingId, entityType, entityId];
}

export function useListDocuments(
  weddingId: number | undefined,
  entityType?: string,
  entityId?: number,
) {
  return useQuery<WeddingDocument[]>({
    queryKey: docKey(weddingId!, entityType, entityId),
    queryFn: async () => {
      if (!weddingId) return [];
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (entityId != null) params.set('entityId', String(entityId));
      const r = await fetch(`${API}/weddings/${weddingId}/documents?${params}`);
      if (!r.ok) throw new Error('Failed to fetch documents');
      return r.json();
    },
    enabled: !!weddingId,
  });
}

export function useCreateDocument(weddingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      objectPath: string;
      contentType?: string;
      size?: number;
      entityType?: string;
      entityId?: number;
    }) => {
      const r = await fetch(`${API}/weddings/${weddingId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('Failed to create document');
      return r.json() as Promise<WeddingDocument>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', weddingId] });
    },
  });
}

export function useDeleteDocument(weddingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API}/weddings/${weddingId}/documents/${id}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error('Failed to delete document');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', weddingId] });
    },
  });
}

export function useDocumentUpload(
  weddingId: number,
  opts: { entityType?: string; entityId?: number },
) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createDocument = useCreateDocument(weddingId);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      try {
        // Step 1: get presigned URL
        const urlRes = await fetch(`${API}/storage/uploads/request-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || 'application/octet-stream',
          }),
        });
        if (!urlRes.ok) throw new Error('Impossible d\'obtenir l\'URL de téléchargement');
        const { uploadURL, objectPath } = await urlRes.json();

        // Step 2: upload directly to GCS
        const putRes = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!putRes.ok) throw new Error('Échec du téléchargement du fichier');

        // Step 3: persist metadata
        await createDocument.mutateAsync({
          name: file.name,
          objectPath,
          contentType: file.type || undefined,
          size: file.size,
          entityType: opts.entityType ?? 'wedding',
          entityId: opts.entityId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue';
        setError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [weddingId, opts.entityType, opts.entityId, createDocument],
  );

  return { upload, isUploading, error };
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function downloadUrl(objectPath: string): string {
  return `${BASE}/api/storage${objectPath}`;
}
