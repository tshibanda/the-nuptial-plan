import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateMilestone, useUpdateMilestone, useDeleteMilestone, getListMilestonesQueryKey, getGetWeddingDashboardQueryKey } from '@workspace/api-client-react';
import type { Milestone } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface MilestoneDialogProps {
  weddingId: number;
  milestone?: Milestone;
  children: React.ReactNode;
}

export function MilestoneDialog({ weddingId, milestone, children }: MilestoneDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: milestone?.title || '',
    detail: milestone?.detail || '',
    dueDate: milestone?.dueDate ? milestone.dueDate.split('T')[0] : '',
    completed: milestone?.completed || false,
  });

  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title: formData.title,
      detail: formData.detail || undefined,
      dueDate: formData.dueDate,
      completed: formData.completed,
    };

    if (milestone) {
      updateMilestone.mutate(
        { milestoneId: milestone.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Étape mise à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createMilestone.mutate(
        { weddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Étape ajoutée' });
            setOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!milestone) return;
    if (!confirm('Supprimer cette étape ?')) return;

    deleteMilestone.mutate(
      { milestoneId: milestone.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: 'Étape supprimée' });
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {milestone ? 'Modifier l\'étape' : 'Nouvelle étape'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="input-milestone-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="detail">Détails</Label>
            <Textarea
              id="detail"
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              rows={3}
              data-testid="input-milestone-detail"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Date d'échéance *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              data-testid="input-milestone-date"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={formData.completed}
              onCheckedChange={(checked) => setFormData({ ...formData, completed: checked === true })}
              data-testid="checkbox-milestone-completed"
            />
            <Label htmlFor="completed" className="cursor-pointer">
              Complétée
            </Label>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {milestone && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMilestone.isPending}
                  data-testid="button-delete-milestone"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMilestone.isPending || updateMilestone.isPending} data-testid="button-submit-milestone">
                  {milestone ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
