import { useRef, useState } from 'react';
import { Paperclip, Download, Trash2, Upload, FolderOpen } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
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
import { PremiumBadge } from '@/components/premium-badge';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { useLanguage } from '@/lib/i18n';

function DocRow({
  doc,
  onDelete,
}: {
  doc: WeddingDocument;
  onDelete: (id: number) => void;
}) {
  const { language, formatDate } = useLanguage();
  const tr = (frText: string, en: string) => language === 'fr' ? frText : en;
  return (
    <div className="flex items-center gap-3 border-b border-[#e3dbd0] px-5 py-3.5 last:border-0">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full badge-deposit">
        <Paperclip size={12} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{doc.name}</p>
        <p className="mt-0.5 text-[10px] text-[#a5a19a]">
          {formatDate(doc.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatFileSize(doc.size)}
        </p>
      </div>
      <a
        href={downloadUrl(doc.objectPath)}
        target="_blank"
        rel="noopener noreferrer"
        download={doc.name}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={tr('Télécharger', 'Download')}
        data-testid={`button-download-doc-${doc.id}`}
      >
        <Download size={15} />
      </a>
      <button
        type="button"
        onClick={() => onDelete(doc.id)}
        className="rounded p-1.5 text-[#a5a19a] hover:bg-red-50 hover:text-red-500 transition-colors"
        title={tr('Supprimer', 'Delete')}
        data-testid={`button-delete-doc-${doc.id}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function UploadZone({ weddingId, entityType, entityId }: { weddingId: number; entityType: string; entityId?: number }) {
  const { language } = useLanguage();
  const tr = (frText: string, en: string) => language === 'fr' ? frText : en;
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
        className="btn-gold flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] disabled:opacity-50 transition-all"
        data-testid="button-upload-doc"
      >
        <Upload size={11} />
        {isUploading ? tr('Envoi en cours…', 'Uploading…') : tr('Ajouter un fichier', 'Add file')}
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
  const { language } = useLanguage();
  const tr = (frText: string, en: string) => language === 'fr' ? frText : en;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-5 card-depth">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="eyebrow text-[#a8893e]">
            {title}
          </p>
          <p className="mt-1 text-[11px] text-[#858b89]">
            {language === 'fr' ? `${docs.length} fichier${docs.length !== 1 ? 's' : ''}` : `${docs.length} file${docs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(200,169,110,0.15)] text-[9px] text-[#a8893e]">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <>
          <UploadZone weddingId={weddingId} entityType={entityType} entityId={entityId} />
          {docs.length === 0 ? (
            <div className="px-5 py-4 text-[11px] italic text-[#a5a19a]">
              {tr('Aucun document joint.', 'No attachment.')}
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
  const { language } = useLanguage();
  const tr = (frText: string, en: string) => language === 'fr' ? frText : en;
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { activeWeddingId } = useActiveWedding();
  const { data: allDocs = [] } = useListDocuments(activeWeddingId ?? undefined);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);
  const { data: contracts = [] } = useListContracts(activeWeddingId!);
  const deleteDoc = useDeleteDocument(activeWeddingId!);

  if (!premiumLoading && !isPremium) {
    return <PremiumPageGate featureLabel={tr('votre coffre-fort de documents', 'your document vault')} />;
  }

  if (!activeWeddingId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-serif text-xl text-muted-foreground">{tr('Sélectionnez un mariage', 'Select a wedding')}</p>
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
      <PageTour
        tourKey="documents"
        pageTitle={tr('Documents', 'Documents')}
        pageIcon={FolderOpen}
        steps={[
          { icon: FolderOpen, title: tr('Coffre-fort numérique', 'Digital vault'), body: tr('Centralisez tous vos fichiers importants — contrats signés, plans de salle, listes de musique, photos d\'inspiration.', 'Keep all important files together—signed contracts, seating plans, music lists, and inspiration photos.') },
          { icon: Upload, title: tr('Téléverser un fichier', 'Upload a file'), body: tr('Cliquez sur « Ajouter un fichier » pour sélectionner un document depuis votre ordinateur et l\'uploader dans le dossier.', 'Click “Add file” to select a document from your computer and upload it.') },
          { icon: Paperclip, title: tr('Catégories', 'Categories'), body: tr('Les documents sont triés par type. Utilisez les filtres de catégorie pour retrouver un fichier spécifique rapidement.', 'Documents are organised by type so you can find a specific file quickly.') },
          { icon: Download, title: tr('Télécharger', 'Download'), body: tr('Cliquez sur l\'icône de téléchargement à droite de chaque fichier pour l\'enregistrer sur votre appareil à tout moment.', 'Click the download icon beside a file to save it to your device at any time.') },
        ]}
      />
      {/* Hero header */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">{tr('Dossier du mariage', 'Wedding file')}</p>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">{tr('Documents', 'Documents')}</h1>
              <PremiumBadge />
            </div>
          </div>
          <span className="rounded-full badge-pending px-3 py-1.5 text-[10px] font-semibold">
            {language === 'fr' ? `${allDocs.length} fichier${allDocs.length !== 1 ? 's' : ''}` : `${allDocs.length} file${allDocs.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* General dossier documents */}
      <Section
        title={tr('Dossier général', 'General file')}
        docs={weddingDocs}
        weddingId={activeWeddingId}
        entityType="wedding"
        onDelete={handleDelete}
      />

      {/* Vendor documents */}
      {vendorSections.length > 0 && vendorSections.map(({ vendor, docs }) => (
        <Section
          key={vendor.id}
          title={`${tr('Prestataire', 'Vendor')} — ${vendor.name}`}
          docs={docs}
          weddingId={activeWeddingId}
          entityType="vendor"
          entityId={vendor.id}
          onDelete={handleDelete}
        />
      ))}
      {orphanVendorDocs.length > 0 && (
        <Section
          title={tr('Prestataires (divers)', 'Vendors (miscellaneous)')}
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
          title={`${tr('Contrat', 'Contract')} — ${contract.vendorName}`}
          docs={docs}
          weddingId={activeWeddingId}
          entityType="contract"
          entityId={contract.id}
          onDelete={handleDelete}
        />
      ))}
      {orphanContractDocs.length > 0 && (
        <Section
          title={tr('Contrats (divers)', 'Contracts (miscellaneous)')}
          docs={orphanContractDocs}
          weddingId={activeWeddingId}
          entityType="contract"
          onDelete={handleDelete}
        />
      )}

      {allDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full badge-deposit">
            <FolderOpen size={28} />
          </span>
          <p className="font-serif text-xl text-muted-foreground">{tr('Dossier vide', 'Empty file')}</p>
          <p className="text-[12px] text-[#858b89]">
            {tr('Ajoutez vos premiers documents depuis le dossier général ci-dessus,', 'Add your first documents from the general file above,')}<br />
            {tr('ou directement depuis la fiche d\'un prestataire ou contrat.', 'or directly from a vendor or contract record.')}
          </p>
        </div>
      )}
    </div>
  );
}
