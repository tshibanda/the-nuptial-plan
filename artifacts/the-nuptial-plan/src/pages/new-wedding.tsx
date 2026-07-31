import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWedding, getListWeddingsQueryKey, getGetDashboardOverviewQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function NewWedding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    coupleName: '',
    partner1: '',
    partner2: '',
    weddingDate: '',
    venue: '',
    budgetTotal: '',
    guestCountTarget: '',
    venueImageUrl: '',
    notes: '',
  });

  const createWedding = useCreateWedding();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      coupleName: formData.coupleName,
      partner1: formData.partner1 || undefined,
      partner2: formData.partner2 || undefined,
      weddingDate: formData.weddingDate,
      venue: formData.venue,
      budgetTotal: Number(formData.budgetTotal),
      guestCountTarget: formData.guestCountTarget ? Number(formData.guestCountTarget) : undefined,
      venueImageUrl: formData.venueImageUrl || undefined,
      notes: formData.notes || undefined,
    };

    createWedding.mutate(
      { data },
      {
        onSuccess: (newWedding) => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
          toast({ title: 'Dossier créé avec succès' });
          setLocation(`/mariages/${newWedding.id}`);
        },
        onError: () => {
          toast({ title: 'Erreur lors de la création', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] p-12 max-w-5xl mx-auto">
      <Link href="/" data-testid="link-back-dashboard">
        <Button variant="ghost" size="sm" className="mb-8 font-mono uppercase tracking-wider text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au registre
        </Button>
      </Link>

      <div className="space-y-8">
        <div className="border-b-2 border-border pb-6">
          <h1 className="text-5xl font-display font-semibold mb-3 tracking-tight">Nouveau dossier</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
            Création d'un dossier de mariage
          </p>
        </div>

        <Card className="p-10 border-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="coupleName" className="text-sm font-mono uppercase tracking-wider">
                Nom du couple *
              </Label>
              <Input
                id="coupleName"
                value={formData.coupleName}
                onChange={(e) => setFormData({ ...formData, coupleName: e.target.value })}
                placeholder="Marie & Thomas Lefèvre"
                required
                data-testid="input-wedding-couplename"
                className="border-2 font-display text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="partner1" className="text-sm font-mono uppercase tracking-wider">
                  Partenaire 1
                </Label>
                <Input
                  id="partner1"
                  value={formData.partner1}
                  onChange={(e) => setFormData({ ...formData, partner1: e.target.value })}
                  placeholder="Marie Beaumont"
                  data-testid="input-wedding-partner1"
                  className="border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="partner2" className="text-sm font-mono uppercase tracking-wider">
                  Partenaire 2
                </Label>
                <Input
                  id="partner2"
                  value={formData.partner2}
                  onChange={(e) => setFormData({ ...formData, partner2: e.target.value })}
                  placeholder="Thomas Lefèvre"
                  data-testid="input-wedding-partner2"
                  className="border-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="weddingDate" className="text-sm font-mono uppercase tracking-wider">
                  Date du mariage *
                </Label>
                <Input
                  id="weddingDate"
                  type="date"
                  value={formData.weddingDate}
                  onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                  required
                  data-testid="input-wedding-date"
                  className="border-2 font-mono"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="venue" className="text-sm font-mono uppercase tracking-wider">
                  Lieu *
                </Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Château de Chantilly"
                  required
                  data-testid="input-wedding-venue"
                  className="border-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="budgetTotal" className="text-sm font-mono uppercase tracking-wider">
                  Budget total (€) *
                </Label>
                <Input
                  id="budgetTotal"
                  type="number"
                  step="0.01"
                  value={formData.budgetTotal}
                  onChange={(e) => setFormData({ ...formData, budgetTotal: e.target.value })}
                  placeholder="50000"
                  required
                  data-testid="input-wedding-budget"
                  className="border-2 font-mono"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="guestCountTarget" className="text-sm font-mono uppercase tracking-wider">
                  Nombre d'invités cible
                </Label>
                <Input
                  id="guestCountTarget"
                  type="number"
                  value={formData.guestCountTarget}
                  onChange={(e) => setFormData({ ...formData, guestCountTarget: e.target.value })}
                  placeholder="120"
                  data-testid="input-wedding-guestcount"
                  className="border-2 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="venueImageUrl" className="text-sm font-mono uppercase tracking-wider">
                URL de l'image du lieu
              </Label>
              <Input
                id="venueImageUrl"
                type="url"
                value={formData.venueImageUrl}
                onChange={(e) => setFormData({ ...formData, venueImageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-wedding-image"
                className="border-2 font-mono"
              />
              <p className="text-xs text-muted-foreground font-mono">
                Optionnel — URL d'une photographie du lieu
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm font-mono uppercase tracking-wider">
                Notes administratives
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={5}
                placeholder="Informations complémentaires, thème, remarques internes..."
                data-testid="input-wedding-notes"
                className="border-2"
              />
            </div>

            <div className="flex gap-4 pt-6 border-t-2 border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/')}
                className="font-mono uppercase tracking-wider text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createWedding.isPending}
                data-testid="button-submit-wedding"
                className="font-mono uppercase tracking-wider text-xs"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Créer le dossier
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
