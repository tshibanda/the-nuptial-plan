import { useState } from 'react';
import { Plus, Pencil, Wallet, Tag, AlertCircle } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListBudgetCategories,
  useGetBudgetSummary,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  getListBudgetCategoriesQueryKey,
  getGetBudgetSummaryQueryKey,
  useListWeddings,
} from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const budgetSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  allocatedCents: z.number().min(0),
  spentCents: z.number().min(0),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

/** Vivid brand-aligned colours — matches mobile CHART_COLORS */
const CHART_COLORS = [
  '#5D2D5D', // plum
  '#C8A96E', // gold
  '#CC8C94', // rose
  '#6B8C72', // sage
  '#9B89C4', // lavender
  '#6B8FC0', // blue
  '#7A4A7A', // plum-light
  '#A8893E', // gold-dim
  '#A0606A', // rose-dark
  '#4A6A4A', // sage-dark
];

// ── Custom tooltip ────────────────────────────────────────────────────────────
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2 shadow-md"
      style={{ fontFamily: 'inherit' }}
    >
      <p className="text-[11px] font-semibold text-foreground">{d.name}</p>
      <p className="mt-0.5 text-[10px] text-[#8c8b86]">
        {formatCurrency(d.allocatedCents)}
      </p>
    </div>
  );
}

// ── Donut chart component ─────────────────────────────────────────────────────
interface DonutChartProps {
  categories: Array<{ id: number; name: string; allocatedCents: number; spentCents: number }>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  totalSpent: number;
  totalAllocated: number;
}

function DonutChart({ categories, selectedId, onSelect, totalSpent, totalAllocated, language }: DonutChartProps & { language: 'fr' | 'en' }) {
  const total = categories.reduce((s, c) => s + c.allocatedCents, 0);
  if (total === 0 || categories.length === 0) return null;

  const data = categories.map((c, i) => ({
    ...c,
    value: c.allocatedCents,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  }));

  const pct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  const selectedCat = selectedId !== null ? categories.find((c) => c.id === selectedId) : null;

  const centreLine1 = selectedCat
    ? selectedCat.name.length > 12 ? selectedCat.name.slice(0, 11) + '…' : selectedCat.name
    : `${pct}%`;
  const centreLine2 = selectedCat
    ? formatCurrency(selectedCat.spentCents)
    : language === 'fr' ? 'dépensé' : 'spent';

  const handleClick = (entry: any) => {
    const id = entry?.id as number;
    if (id == null) return;
    onSelect(selectedId === id ? null : id);
  };

  return (
    <div className="mb-8 card-depth px-5 py-5">
      <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">{language === 'fr' ? 'Répartition du budget' : 'Budget breakdown'}</p>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Chart */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={data}
                cx={95}
                cy={95}
                innerRadius={52}
                outerRadius={86}
                paddingAngle={0}
                dataKey="value"
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    opacity={selectedId !== null && selectedId !== entry.id ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centre label — absolutely positioned over the hole */}
          <div
            className="pointer-events-none absolute flex flex-col items-center justify-center"
            style={{ inset: 0 }}
          >
            <span
              className="leading-tight text-[#3d2040]"
              style={{ fontSize: selectedCat ? 12 : 20, fontWeight: 700 }}
            >
              {centreLine1}
            </span>
            <span className="mt-0.5 text-[9px] text-[#8c8b86]">{centreLine2}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap content-start gap-1.5">
          {data.map((entry) => {
            const isSelected = selectedId === entry.id;
            const dimmed = selectedId !== null && !isSelected;
            return (
              <button
                key={entry.id}
                onClick={() => onSelect(isSelected ? null : entry.id)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-opacity"
                style={{ opacity: dimmed ? 0.4 : 1 }}
              >
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span
                  className="text-[10px]"
                  style={{
                    color: isSelected ? '#3d2040' : '#8c8b86',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {entry.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Budget() {
  const { language } = useLanguage();
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en;
  const { activeWeddingId } = useActiveWedding();
  const { data: weddings = [] } = useListWeddings();
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const currencySymbol = ({ EUR: '€', GBP: '£', USD: '$', CHF: 'CHF' } as Record<string, string>)[activeWedding?.currency ?? 'EUR'] ?? activeWedding?.currency ?? '€';
  const { data: categories = [], isLoading } = useListBudgetCategories(activeWeddingId!);
  const { data: summary } = useGetBudgetSummary(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // Enrich categories with their stable original index so colour mapping survives filtering
  const categoriesWithIndex = categories.map((c, i) => ({ ...c, originalIndex: i }));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useCreateBudgetCategory();
  const updateCategory = useUpdateBudgetCategory();
  const deleteCategory = useDeleteBudgetCategory();

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      allocatedCents: 0,
      spentCents: 0,
    },
  });

  const onSubmit = (data: BudgetFormData) => {
    if (!activeWeddingId) return;

    if (editingCategory) {
      updateCategory.mutate(
        { weddingId: activeWeddingId, id: editingCategory, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetCategoriesQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetBudgetSummaryQueryKey(activeWeddingId) });
            toast({ title: tr('Catégorie mise à jour', 'Category updated') });
            setOpen(false);
            setEditingCategory(null);
            form.reset();
          },
        }
      );
    } else {
      createCategory.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetCategoriesQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetBudgetSummaryQueryKey(activeWeddingId) });
            toast({ title: tr('Catégorie ajoutée', 'Category added') });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category.id);
    form.reset({
      name: category.name,
      allocatedCents: category.allocatedCents,
      spentCents: category.spentCents,
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm(tr('Supprimer cette catégorie ?', 'Delete this category?'))) {
      deleteCategory.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetCategoriesQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetBudgetSummaryQueryKey(activeWeddingId) });
            toast({ title: tr('Catégorie supprimée', 'Category deleted') });
          },
        }
      );
    }
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">{tr('Chargement…', 'Loading…')}</div>;
  }

  const safePct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);
  const budgetPct = summary ? safePct(summary.totalSpent, summary.totalAllocated) : 0;

  return (
    <div>
      <PageTour
        tourKey="budget"
        pageTitle={tr('Budget', 'Budget')}
        pageIcon={Wallet}
        steps={[
          { icon: Wallet, title: 'Vue d\'ensemble', body: 'La barre de progression compare le total engagé au budget global défini dans les paramètres du mariage.' },
          { icon: Tag, title: 'Catégories', body: 'Organisez vos dépenses par poste — Fleurs, Traiteur, Musique… Chaque catégorie dispose de son propre budget alloué.' },
          { icon: Plus, title: 'Ajouter une catégorie', body: 'Créez un nouveau poste budgétaire, définissez le montant alloué et renseignez les dépenses réelles au fil du temps.' },
          { icon: AlertCircle, title: 'Alertes de dépassement', body: 'Les catégories dont les dépenses dépassent le budget alloué sont automatiquement signalées en rouge.' },
        ]}
      />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">{tr('Où en est-on', 'Where things stand')}</p>
            <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Budget</h1>
          </div>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditingCategory(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-category">
              <Plus size={14} /> {tr('Ajouter une catégorie', 'Add a category')}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingCategory ? tr('Modifier la catégorie', 'Edit category') : tr('Nouvelle catégorie', 'New category')}
              </SheetTitle>
              <SheetDescription>
                {editingCategory ? tr('Mettez à jour les informations', 'Update the information') : tr('Ajoutez une catégorie budgétaire', 'Add a budget category')}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Nom de la catégorie', 'Category name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={tr('Ex. : Lieu et traiteur', 'E.g. Venue & catering')} data-testid="input-category-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allocatedCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Budget alloué', 'Allocated budget')} ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                          data-testid="input-category-allocated"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spentCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Dépensé', 'Spent')} ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                          data-testid="input-category-spent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-category">
                    {editingCategory ? tr('Mettre à jour', 'Update') : tr('Ajouter', 'Add')}
                  </Button>
                  {editingCategory && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingCategory)}
                      data-testid="button-delete-category"
                    >
                      {tr('Supprimer', 'Delete')}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-8 card-depth px-5 py-5">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">{tr('Engagé', 'Committed')}</p>
              <p className="mt-1 font-serif text-[30px] text-foreground">
                {formatCurrency(summary.totalSpent)}{' '}
                <span className="font-sans text-[11px] text-[#8c8b86]">
                  / {formatCurrency(summary.totalAllocated)}
                </span>
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#7c8e83]">{budgetPct}%</span>
          </div>
          <div className="h-1 bg-[#e6dfd5]">
            <div className="h-full bg-[#ab8b52]" style={{ width: `${budgetPct}%` }} />
          </div>
        </div>
      )}

      {/* Donut chart — only shown when there are categories with allocated budgets */}
      {categories.length > 0 && categories.some((c) => c.allocatedCents > 0) && (
        <DonutChart
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          totalSpent={summary?.totalSpent ?? 0}
          totalAllocated={summary?.totalAllocated ?? 0}
          language={language}
        />
      )}

      {/* Categories — filtered to selected when a slice is active */}
      {selectedCategoryId !== null && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] text-[#8c8b86]">{tr('Filtré par catégorie', 'Filtered by category')}</span>
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="text-[10px] font-semibold text-[#5D2D5D] underline underline-offset-2"
          >
            {tr('Tout afficher', 'Show all')}
          </button>
        </div>
      )}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="rounded border border-border bg-card px-6 py-12 text-center text-[11px] text-[#858b89]">
            {tr('Aucune catégorie. Cliquez sur "Ajouter une catégorie" pour commencer.', 'No categories. Click “Add a category” to get started.')}
          </div>
        ) : (
          categoriesWithIndex
            .filter((c) => selectedCategoryId === null || c.id === selectedCategoryId)
            .map((category) => {
            const i = category.originalIndex;
            const pct = safePct(category.spentCents, category.allocatedCents);
            const isSelected = selectedCategoryId === category.id;
            const isDimmed = false; // we filter instead of dimming
            const chartColor = CHART_COLORS[i % CHART_COLORS.length]!;

            const colorClass =
              pct >= 90
                ? 'bg-[#9d5449]'
                : pct >= 75
                  ? 'bg-[#ab8b52]'
                  : pct >= 50
                    ? 'bg-[#bd9b73]'
                    : 'bg-[#879b93]';

            return (
              <div
                key={category.id}
                className="rounded border bg-card p-5 transition-opacity"
                style={{
                  borderColor: isSelected ? chartColor : undefined,
                  borderWidth: isSelected ? 1.5 : undefined,
                  opacity: isDimmed ? 0.4 : 1,
                  cursor: 'pointer',
                  // left accent bar effect via box-shadow when selected
                  boxShadow: isSelected ? `inset 3px 0 0 ${chartColor}` : undefined,
                }}
                onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span
                          className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: chartColor }}
                        />
                      )}
                      <p className="text-[12px] font-semibold text-[#3d4d55]">{category.name}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-[#858b89]">
                      {formatCurrency(category.spentCents)} /{' '}
                      {formatCurrency(category.allocatedCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#7c8e83]">{pct}%</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                      className="text-[#a5a19a]"
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-[#e6dfd5]">
                  <div
                    className={`h-full ${isSelected ? '' : colorClass}`}
                    style={{
                      width: `${pct}%`,
                      ...(isSelected ? { backgroundColor: chartColor } : {}),
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
