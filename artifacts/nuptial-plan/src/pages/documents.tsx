import { useRef, useState } from 'react';
import { Paperclip, Download, Trash2, Upload, FolderOpen } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListDocuments,
  useDeleteDocument,
  useDocumentUpload,
  formatFileSize,
  downloadUrl,
  WeddingDocument,
} from '@/lib/use-documents';
import { useListVendors } from '@workspace/api-client-react';
import { useListContracts } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function DocRow({
  doc,
  onDelete,
}: {
  doc: WeddingDocument;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#e3dbd0] px-5 py-3.5 last:border-0">
      <Paperclip size={13} className="shrink-0 text-[#9b8258]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{doc.name}</p>
        <p className="mt-0.5 text-[10px] text-[#a5a19a]">
          {format(new Date(doc.createdAt), 'd MMM yyyy', { locale: fr })} · {formatFileSize(doc.size)}
        </p>
      </div>
      <a
        href={downloadUrl(doc.objectPath)}
        target="_blank"
        rel="noopener noreferrer"
        download={doc.name}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Télécharger"
        data-testid={`button-download-doc-${doc.id}`}
      >
        <Download size={15} />
      </a>
      <button
        type="button"
        onClick={() => onDelete(doc.id)}
        className="rounded p-1.5 text-[#a5a19a] hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Supprimer"
        data-testid={`button-delete-doc-${doc.id}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function UploadZone({ weddingId, entityType, entityId }: { weddingId: number; entityType: string; entityId?: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useDocumentUpload(weddingId, { entityType, entityId });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await upload(file);
    e.target.value = '';
  };

  return (
    <div className="px-5 py-3 border-b border-[#e3dbd0]">
      {error && <p className="mb-2 text-[11px] text-red-500">{error}</p>}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        data-testid="button-upload-doc"
      >
        <Upload size={13} />
        {isUploading ? 'Envoi en cours…' : 'Ajouter un fichier'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-file-upload"
      />
    </div>
  );
}

function Section({
  title,
  docs,
  weddingId,
  entityType,
  entityId,
  onDelete,
}: {
  title: string;
  docs: WeddingDocument[];
  weddingId: number;
  entityType: string;
  entityId?: number;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-6 overflow-hidden border border-border bg-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8258]">
            {title}
          </p>
          <p className="text-[11px] text-[#858b89]">
            {docs.length} fichier{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="text-[10px] text-[#a5a19a]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <>
          <UploadZone weddingId={weddingId} entityType={entityType} entityId={entityId} />
          {docs.length === 0 ? (
            <div className="px-5 py-4 text-[11px] italic text-[#a5a19a]">
              Aucun document joint.
            </div>
          ) : (
            docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} onDelete={onDelete} />
            ))
          )}
        </>
      )}
    </div>
  );
}

export default function Documents() {
  const { activeWeddingId } = useActiveWedding();
  const { data: allDocs = [] } = useListDocuments(activeWeddingId ?? undefined);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);
  const { data: contracts = [] } = useListContracts(activeWeddingId!);
  const deleteDoc = useDeleteDocument(activeWeddingId!);

  if (!activeWeddingId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-serif text-xl text-muted-foreground">Sélectionnez un mariage</p>
      </div>
    );
  }

  const weddingDocs = allDocs.filter((d) => d.entityType === 'wedding');
  const vendorDocs = allDocs.filter((d) => d.entityType === 'vendor');
  const contractDocs = allDocs.filter((d) => d.entityType === 'contract');

  // Group vendor docs by entityId, map to vendor names
  const vendorSections = vendors
    .filter((v) => vendorDocs.some((d) => d.entityId === v.id))
    .map((v) => ({
      vendor: v,
      docs: vendorDocs.filter((d) => d.entityId === v.id),
    }));

  // Vendor docs not matched to a vendor (orphaned)
  const orphanVendorDocs = vendorDocs.filter(
    (d) => !vendors.some((v) => v.id === d.entityId),
  );

  // Group contract docs by entityId
  const contractSections = contracts
    .filter((c) => contractDocs.some((d) => d.entityId === c.id))
    .map((c) => ({
      contract: c,
      docs: contractDocs.filter((d) => d.entityId === c.id),
    }));

  const orphanContractDocs = contractDocs.filter(
    (d) => !contracts.some((c) => c.id === d.entityId),
  );

  const handleDelete = (id: number) => deleteDoc.mutate(id);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
          Dossier du mariage
        </p>
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Documents</h1>
          <p className="text-[11px] text-[#858b89]">
            {allDocs.length} fichier{allDocs.length !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* General dossier documents */}
      <Section
        title="Dossier général"
        docs={weddingDocs}
        weddingId={activeWeddingId}
        entityType="wedding"
        onDelete={handleDelete}
      />

      {/* Vendor documents */}
      {vendorSections.length > 0 && vendorSections.map(({ vendor, docs }) => (
        <Section
          key={vendor.id}
          title={`Prestataire — ${vendor.name}`}
          docs={docs}
          weddingId={activeWeddingId}
          entityType="vendor"
          entityId={vendor.id}
          onDelete={handleDelete}
        />
      ))}
      {orphanVendorDocs.length > 0 && (
        <Section
          title="Prestataires (divers)"
          docs={orphanVendorDocs}
          weddingId={activeWeddingId}
          entityType="vendor"
          onDelete={handleDelete}
        />
      )}

      {/* Contract documents */}
      {contractSections.length > 0 && contractSections.map(({ contract, docs }) => (
        <Section
          key={contract.id}
          title={`Contrat — ${contract.vendorName}`}
          docs={docs}
          weddingId={activeWeddingId}
          entityType="contract"
          entityId={contract.id}
          onDelete={handleDelete}
        />
      ))}
      {orphanContractDocs.length > 0 && (
        <Section
          title="Contrats (divers)"
          docs={orphanContractDocs}
          weddingId={activeWeddingId}
          entityType="contract"
          onDelete={handleDelete}
        />
      )}

      {allDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <FolderOpen size={40} className="text-[#c9b99a]" />
          <p className="font-serif text-xl text-muted-foreground">Dossier vide</p>
          <p className="text-[12px] text-[#858b89]">
            Ajoutez vos premiers documents depuis le dossier général ci-dessus,<br />
            ou directement depuis la fiche d'un prestataire ou contrat.
          </p>
        </div>
      )}
    </div>
  );
}
