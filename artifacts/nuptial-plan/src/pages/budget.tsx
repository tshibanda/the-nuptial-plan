import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListBudgetCategories,
  useGetBudgetSummary,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  getListBudgetCategoriesQueryKey,
  getGetBudgetSummaryQueryKey,
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

const budgetSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  allocatedCents: z.number().min(0),
  spentCents: z.number().min(0),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export default function Budget() {
  const { activeWeddingId } = useActiveWedding();
  const { data: categories = [], isLoading } = useListBudgetCategories(activeWeddingId!);
  const { data: summary } = useGetBudgetSummary(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
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
            toast({ title: 'Catégorie mise à jour' });
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
            toast({ title: 'Catégorie ajoutée' });
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
    if (confirm('Supprimer cette catégorie ?')) {
      deleteCategory.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetCategoriesQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetBudgetSummaryQueryKey(activeWeddingId) });
            toast({ title: 'Catégorie supprimée' });
          },
        }
      );
    }
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  const safePct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);
  const budgetPct = summary ? safePct(summary.totalSpent, summary.totalAllocated) : 0;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
            Où en est-on
          </p>
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
            <Button className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90" data-testid="button-add-category">
              <Plus size={14} /> Ajouter une catégorie
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </SheetTitle>
              <SheetDescription>
                {editingCategory ? 'Mettez à jour les informations' : 'Ajoutez une catégorie budgétaire'}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la catégorie</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Lieu & traiteur" data-testid="input-category-name" />
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
                      <FormLabel>Budget alloué (£)</FormLabel>
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
                      <FormLabel>Dépensé (£)</FormLabel>
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
                    {editingCategory ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingCategory && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingCategory)}
                      data-testid="button-delete-category"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-8 border-y border-border bg-card px-5 py-5">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">Engagé</p>
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

      {/* Categories */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="rounded border border-border bg-card px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucune catégorie. Cliquez sur "Ajouter une catégorie" pour commencer.
          </div>
        ) : (
          categories.map((category) => {
            const pct = safePct(category.spentCents, category.allocatedCents);
            const colorClass =
              pct >= 90
                ? 'bg-[#9d5449]'
                : pct >= 75
                  ? 'bg-[#ab8b52]'
                  : pct >= 50
                    ? 'bg-[#bd9b73]'
                    : 'bg-[#879b93]';

            return (
              <div key={category.id} className="rounded border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-[#3d4d55]">{category.name}</p>
                    <p className="mt-1 text-[10px] text-[#858b89]">
                      {formatCurrency(category.spentCents)} /{' '}
                      {formatCurrency(category.allocatedCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#7c8e83]">{pct}%</span>
                    <button onClick={() => handleEdit(category)} className="text-[#a5a19a]" data-testid={`button-edit-category-${category.id}`}>
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-[#e6dfd5]">
                  <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
