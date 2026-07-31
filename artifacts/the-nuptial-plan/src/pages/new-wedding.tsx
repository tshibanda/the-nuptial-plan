import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWedding, getListWeddingsQueryKey, getGetDashboardOverviewQueryKey } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
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
          toast({ title: 'Mariage créé avec succès' });
          setLocation(`/mariages/${newWedding.id}`);
        },
        onError: () => {
          toast({ title: 'Erreur lors de la création', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] p-8 max-w-4xl mx-auto">
      <Link href="/" data-testid="link-back-dashboard">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-display font-semibold mb-2">Créer un nouveau mariage</h1>
          <p className="text-muted-foreground">
            Commencez par saisir les informations essentielles du mariage
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="coupleName">Nom du couple *</Label>
              <Input
                id="coupleName"
                value={formData.coupleName}
                onChange={(e) => setFormData({ ...formData, coupleName: e.target.value })}
                placeholder="Marie & Thomas Dupont"
                required
                data-testid="input-wedding-couplename"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner1">Partenaire 1</Label>
                <Input
                  id="partner1"
                  value={formData.partner1}
                  onChange={(e) => setFormData({ ...formData, partner1: e.target.value })}
                  placeholder="Marie Leblanc"
                  data-testid="input-wedding-partner1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner2">Partenaire 2</Label>
                <Input
                  id="partner2"
                  value={formData.partner2}
                  onChange={(e) => setFormData({ ...formData, partner2: e.target.value })}
                  placeholder="Thomas Dupont"
                  data-testid="input-wedding-partner2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weddingDate">Date du mariage *</Label>
                <Input
                  id="weddingDate"
                  type="date"
                  value={formData.weddingDate}
                  onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                  required
                  data-testid="input-wedding-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Lieu *</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Château de Versailles"
                  required
                  data-testid="input-wedding-venue"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetTotal">Budget total (€) *</Label>
                <Input
                  id="budgetTotal"
                  type="number"
                  step="0.01"
                  value={formData.budgetTotal}
                  onChange={(e) => setFormData({ ...formData, budgetTotal: e.target.value })}
                  placeholder="50000"
                  required
                  data-testid="input-wedding-budget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestCountTarget">Nombre d'invités cible</Label>
                <Input
                  id="guestCountTarget"
                  type="number"
                  value={formData.guestCountTarget}
                  onChange={(e) => setFormData({ ...formData, guestCountTarget: e.target.value })}
                  placeholder="120"
                  data-testid="input-wedding-guestcount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueImageUrl">URL de l'image du lieu</Label>
              <Input
                id="venueImageUrl"
                type="url"
                value={formData.venueImageUrl}
                onChange={(e) => setFormData({ ...formData, venueImageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-wedding-image"
              />
              <p className="text-xs text-muted-foreground">
                Optionnel - Ajoutez une photo du lieu pour personnaliser la vue
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Informations complémentaires, thème, remarques..."
                data-testid="input-wedding-notes"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createWedding.isPending}
                data-testid="button-submit-wedding"
              >
                Créer le mariage
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
