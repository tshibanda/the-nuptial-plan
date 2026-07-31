import { useParams, Link } from 'wouter';
import { useState } from 'react';
import {
  useGetWedding,
  useGetWeddingDashboard,
  useListVendors,
  useListGuests,
  useListMilestones,
  useListPayments,
  useListContracts,
  getGetWeddingQueryKey,
  getGetWeddingDashboardQueryKey,
  getListMilestonesQueryKey,
  useUpdateMilestone,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, Euro, Users, CheckCircle2, Clock, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatCurrency, getDaysUntilText, formatShortDate } from '@/lib/format';
import { VendorDialog } from '@/components/dialogs/vendor-dialog';
import { GuestDialog } from '@/components/dialogs/guest-dialog';
import { MilestoneDialog } from '@/components/dialogs/milestone-dialog';
import { PaymentDialog } from '@/components/dialogs/payment-dialog';
import { ContractDialog } from '@/components/dialogs/contract-dialog';
import { useToast } from '@/hooks/use-toast';

export default function WeddingDetail() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [activeTab, setActiveTab] = useState('apercu');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingQueryKey(weddingId) },
  });

  const { data: dashboard, isLoading: dashboardLoading } = useGetWeddingDashboard(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingDashboardQueryKey(weddingId) },
  });

  const { data: vendors = [] } = useListVendors(weddingId);
  const { data: guestList } = useListGuests(weddingId);
  const { data: milestones = [] } = useListMilestones(weddingId);
  const { data: payments = [] } = useListPayments(weddingId);
  const { data: contracts = [] } = useListContracts(weddingId);

  const updateMilestone = useUpdateMilestone();

  const toggleMilestone = (milestoneId: number, currentStatus: boolean) => {
    updateMilestone.mutate(
      { milestoneId, data: { completed: !currentStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: currentStatus ? 'Étape marquée incomplète' : 'Étape complétée' });
        },
      }
    );
  };

  if (weddingLoading || dashboardLoading) {
    return (
      <div className="p-12 space-y-8">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!wedding || !dashboard) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground font-mono">Dossier introuvable.</p>
      </div>
    );
  }

  const budgetUsedPercent = (dashboard.budgetCommitted / dashboard.budgetTotal) * 100;
  const tasksCompletePercent = dashboard.tasksTotal > 0 ? (dashboard.tasksDone / dashboard.tasksTotal) * 100 : 0;

  return (
    <div className="min-h-[100dvh]">
      {/* Hero Header */}
      <div className="relative bg-card border-b-2 border-card-border">
        {wedding.venueImageUrl && (
          <div className="absolute inset-0 opacity-5">
            <img
              src={wedding.venueImageUrl}
              alt={wedding.venue}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative p-12 max-w-7xl mx-auto">
          <Link href="/" data-testid="link-back-dashboard">
            <Button variant="ghost" size="sm" className="mb-6 font-mono uppercase tracking-wider text-xs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au registre
            </Button>
          </Link>
          <h1 className="text-6xl font-display font-semibold mb-4 leading-tight">
            {wedding.coupleName}
          </h1>
          <div className="flex flex-wrap items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-mono text-sm">{formatDate(wedding.weddingDate)}</span>
              <span className="ml-3 px-3 py-1 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider rounded border border-primary/20">
                {getDaysUntilText(wedding.weddingDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="font-mono text-sm uppercase tracking-wide">{wedding.venue}</span>
            </div>
            {wedding.guestCountTarget && (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-mono text-sm">{dashboard.guestCount} / {wedding.guestCountTarget} invités</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-12 max-w-7xl mx-auto space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Jours restants" value={dashboard.daysUntil} icon={Clock} variant="primary" />
          <StatCard label="Invités confirmés" value={`${dashboard.confirmedGuests}/${dashboard.guestCount}`} icon={Users} />
          <StatCard
            label="Paiements urgents"
            value={dashboard.urgentPaymentsCount}
            icon={Euro}
            variant={dashboard.urgentPaymentsCount > 0 ? 'destructive' : 'default'}
          />
          <StatCard
            label="Contrats non signés"
            value={dashboard.unsignedContractsCount}
            icon={CheckCircle2}
            variant={dashboard.unsignedContractsCount > 0 ? 'accent' : 'default'}
          />
        </div>

        {/* Budget & Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 border-2">
            <h3 className="text-xl font-display font-semibold mb-6 uppercase tracking-wide">Suivi budgétaire</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Engagé</span>
                <span className="text-3xl font-display font-semibold">
                  {formatCurrency(dashboard.budgetCommitted)}
                </span>
              </div>
              <Progress value={budgetUsedPercent} className="h-3 border border-border" />
              <div className="flex justify-between text-sm font-mono">
                <span className="text-muted-foreground">
                  Total : {formatCurrency(dashboard.budgetTotal)}
                </span>
                <span className="font-semibold">
                  Reste : {formatCurrency(dashboard.budgetRemaining)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-8 border-2">
            <h3 className="text-xl font-display font-semibold mb-6 uppercase tracking-wide">Avancement</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Complétées</span>
                <span className="text-3xl font-display font-semibold">
                  {dashboard.tasksDone} / {dashboard.tasksTotal}
                </span>
              </div>
              <Progress value={tasksCompletePercent} className="h-3 border border-border" />
              <div className="text-sm text-muted-foreground font-mono">
                {dashboard.tasksTotal - dashboard.tasksDone} tâches restantes
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start border-b-2 border-border rounded-none h-auto p-0 bg-transparent gap-1">
            <TabsTrigger 
              value="apercu" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Aperçu
            </TabsTrigger>
            <TabsTrigger 
              value="prestataires" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Prestataires ({vendors.length})
            </TabsTrigger>
            <TabsTrigger 
              value="invites" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Invités ({guestList?.total || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="paiements" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Paiements ({payments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="contrats" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Contrats ({contracts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="etapes" 
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary font-mono uppercase tracking-wider text-xs px-6 py-3"
            >
              Étapes ({milestones.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="space-y-6 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Vendors */}
              <Card className="p-6 border-2">
                <div className="flex items-center justify-between mb-6 border-b-2 border-border pb-4">
                  <h3 className="font-display text-xl font-semibold uppercase tracking-wide">Prestataires</h3>
                  <VendorDialog weddingId={weddingId}>
                    <Button size="sm" variant="outline" className="font-mono uppercase tracking-wider text-xs">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </VendorDialog>
                </div>
                <div className="space-y-4">
                  {vendors.slice(0, 5).map((vendor) => (
                    <div key={vendor.id} className="flex items-start justify-between ruled-line pb-3" data-testid={`vendor-${vendor.id}`}>
                      <div>
                        <p className="font-semibold">{vendor.name}</p>
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mt-1">{vendor.category}</p>
                      </div>
                      <StatusBadge status={vendor.status} />
                    </div>
                  ))}
                  {vendors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 font-mono">Aucun prestataire</p>
                  )}
                  {vendors.length > 5 && (
                    <Link href={`/mariages/${weddingId}/prestataires`}>
                      <Button variant="ghost" size="sm" className="w-full mt-4 font-mono uppercase tracking-wider text-xs">
                        Voir tous les prestataires →
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              {/* Quick Milestones */}
              <Card className="p-6 border-2">
                <div className="flex items-center justify-between mb-6 border-b-2 border-border pb-4">
                  <h3 className="font-display text-xl font-semibold uppercase tracking-wide">Étapes</h3>
                  <MilestoneDialog weddingId={weddingId}>
                    <Button size="sm" variant="outline" className="font-mono uppercase tracking-wider text-xs">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </MilestoneDialog>
                </div>
                <div className="space-y-4">
                  {milestones.slice(0, 5).map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-4 ruled-line pb-3" data-testid={`milestone-${milestone.id}`}>
                      <button
                        onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          milestone.completed 
                            ? 'bg-secondary border-secondary text-secondary-foreground' 
                            : 'border-muted-foreground hover:border-foreground'
                        }`}
                      >
                        {milestone.completed && <Check className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {milestone.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wide">
                          {formatShortDate(milestone.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {milestones.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 font-mono">Aucune étape</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prestataires" className="mt-8">
            <div className="space-y-6">
              <div className="flex justify-end">
                <VendorDialog weddingId={weddingId}>
                  <Button data-testid="button-add-vendor" className="uppercase tracking-wider font-mono text-xs">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un prestataire
                  </Button>
                </VendorDialog>
              </div>
              <Link href={`/mariages/${weddingId}/prestataires`}>
                <Button variant="outline" className="w-full font-mono uppercase tracking-wider text-xs" size="lg">
                  Voir tous les prestataires ({vendors.length}) →
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="invites" className="mt-8">
            <Link href={`/mariages/${weddingId}/invites`}>
              <Button className="w-full uppercase tracking-wider font-mono text-xs" size="lg">
                Gérer la liste des invités ({guestList?.total || 0}) →
              </Button>
            </Link>
          </TabsContent>

          <TabsContent value="paiements" className="mt-8">
            <div className="space-y-6">
              <div className="flex justify-end">
                <PaymentDialog weddingId={weddingId}>
                  <Button data-testid="button-add-payment" className="uppercase tracking-wider font-mono text-xs">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un paiement
                  </Button>
                </PaymentDialog>
              </div>
              <Link href={`/mariages/${weddingId}/paiements`}>
                <Button variant="outline" className="w-full font-mono uppercase tracking-wider text-xs" size="lg">
                  Voir tous les paiements ({payments.length}) →
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="contrats" className="mt-8">
            <div className="space-y-6">
              <div className="flex justify-end">
                <ContractDialog weddingId={weddingId}>
                  <Button data-testid="button-add-contract" className="uppercase tracking-wider font-mono text-xs">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un contrat
                  </Button>
                </ContractDialog>
              </div>
              <Link href={`/mariages/${weddingId}/contrats`}>
                <Button variant="outline" className="w-full font-mono uppercase tracking-wider text-xs" size="lg">
                  Voir tous les contrats ({contracts.length}) →
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="etapes" className="mt-8">
            <div className="space-y-6">
              <div className="flex justify-end">
                <MilestoneDialog weddingId={weddingId}>
                  <Button data-testid="button-add-milestone" className="uppercase tracking-wider font-mono text-xs">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une étape
                  </Button>
                </MilestoneDialog>
              </div>
              <Card className="divide-y-2 divide-border border-2">
                {milestones.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-muted-foreground font-mono">Aucune étape créée</p>
                  </div>
                ) : (
                  milestones.map((milestone) => (
                    <div key={milestone.id} className="p-6 flex items-start gap-4" data-testid={`milestone-full-${milestone.id}`}>
                      <button
                        onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                          milestone.completed 
                            ? 'bg-secondary border-secondary text-secondary-foreground' 
                            : 'border-muted-foreground hover:border-foreground'
                        }`}
                      >
                        {milestone.completed && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-display text-lg font-semibold ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {milestone.title}
                        </p>
                        {milestone.detail && (
                          <p className="text-sm text-muted-foreground mt-2">{milestone.detail}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-3 uppercase tracking-wider">
                          Échéance : {formatDate(milestone.dueDate)}
                        </p>
                      </div>
                      <MilestoneDialog weddingId={weddingId} milestone={milestone}>
                        <Button variant="ghost" size="sm" className="font-mono uppercase tracking-wider text-xs">
                          Modifier
                        </Button>
                      </MilestoneDialog>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
