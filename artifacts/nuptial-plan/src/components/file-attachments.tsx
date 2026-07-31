import { useRef } from 'react';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import {
  useListDocuments,
  useDeleteDocument,
  useDocumentUpload,
  formatFileSize,
  downloadUrl,
} from '@/lib/use-documents';

interface FileAttachmentsProps {
  weddingId: number;
  entityType: string;
  entityId?: number;
  label?: string;
}

export function FileAttachments({
  weddingId,
  entityType,
  entityId,
  label = 'Pièces jointes',
}: FileAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: docs = [], isLoading } = useListDocuments(weddingId, entityType, entityId);
  const deleteDoc = useDeleteDocument(weddingId);
  const { upload, isUploading, error } = useDocumentUpload(weddingId, { entityType, entityId });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await upload(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="mt-6 border-t border-[#e3dbd0] pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8258]">
          {label}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          data-testid="button-upload-file"
        >
          <Upload size={12} />
          {isUploading ? 'Envoi…' : 'Ajouter un fichier'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file-upload"
        />
      </div>

      {error && (
        <p className="mb-2 rounded bg-red-50 px-3 py-2 text-[11px] text-red-600">{error}</p>
      )}

      {isLoading && (
        <p className="text-[11px] text-[#9b9b95]">Chargement…</p>
      )}

      {!isLoading && docs.length === 0 && (
        <p className="text-[11px] italic text-[#a5a19a]">Aucun document joint.</p>
      )}

      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-2 rounded-md border border-[#e3dbd0] bg-[#faf6f0] px-3 py-2.5"
          >
            <Paperclip size={12} className="shrink-0 text-[#9b8258]" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3d4d55]">
              {doc.name}
            </span>
            <span className="shrink-0 text-[10px] text-[#a5a19a]">
              {formatFileSize(doc.size)}
            </span>
            <a
              href={downloadUrl(doc.objectPath)}
              target="_blank"
              rel="noopener noreferrer"
              download={doc.name}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Télécharger"
              data-testid={`button-download-doc-${doc.id}`}
            >
              <Download size={14} />
            </a>
            <button
              type="button"
              onClick={() => deleteDoc.mutate(doc.id)}
              className="shrink-0 rounded p-1 text-[#a5a19a] hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer"
              data-testid={`button-delete-doc-${doc.id}`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
