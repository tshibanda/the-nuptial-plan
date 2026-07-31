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
} from '@workspace/api-client-react';
import { ArrowLeft, Calendar, MapPin, Euro, Users, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatCurrency, getDaysUntilText } from '@/lib/format';
import { VendorDialog } from '@/components/dialogs/vendor-dialog';
import { GuestDialog } from '@/components/dialogs/guest-dialog';
import { MilestoneDialog } from '@/components/dialogs/milestone-dialog';
import { PaymentDialog } from '@/components/dialogs/payment-dialog';
import { ContractDialog } from '@/components/dialogs/contract-dialog';

export default function WeddingDetail() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [activeTab, setActiveTab] = useState('apercu');

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

  if (weddingLoading || dashboardLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!wedding || !dashboard) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Mariage introuvable.</p>
      </div>
    );
  }

  const budgetUsedPercent = (dashboard.budgetCommitted / dashboard.budgetTotal) * 100;
  const tasksCompletePercent = dashboard.tasksTotal > 0 ? (dashboard.tasksDone / dashboard.tasksTotal) * 100 : 0;

  return (
    <div className="min-h-[100dvh]">
      {/* Hero Header */}
      <div className="relative bg-card border-b border-card-border">
        {wedding.venueImageUrl && (
          <div className="absolute inset-0 opacity-10">
            <img
              src={wedding.venueImageUrl}
              alt={wedding.venue}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative p-8 max-w-7xl mx-auto">
          <Link href="/" data-testid="link-back-dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-5xl font-display font-semibold mb-3">
            {wedding.coupleName}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-mono">{formatDate(wedding.weddingDate)}</span>
              <span className="text-primary ml-2 font-medium">
                {getDaysUntilText(wedding.weddingDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{wedding.venue}</span>
            </div>
            {wedding.guestCountTarget && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{dashboard.guestCount} / {wedding.guestCountTarget} invités</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
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
          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold mb-4">Budget</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Engagé</span>
                <span className="text-2xl font-display font-semibold">
                  {formatCurrency(dashboard.budgetCommitted)}
                </span>
              </div>
              <Progress value={budgetUsedPercent} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Total: {formatCurrency(dashboard.budgetTotal)}
                </span>
                <span className="font-medium">
                  Reste: {formatCurrency(dashboard.budgetRemaining)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold mb-4">Étapes</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Complétées</span>
                <span className="text-2xl font-display font-semibold">
                  {dashboard.tasksDone} / {dashboard.tasksTotal}
                </span>
              </div>
              <Progress value={tasksCompletePercent} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {dashboard.tasksTotal - dashboard.tasksDone} tâches restantes
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="apercu" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="prestataires" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Prestataires ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="invites" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Invités ({guestList?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="paiements" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Paiements ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="contrats" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Contrats ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="etapes" className="rounded-none border-b-2 data-[state=active]:border-primary">
              Étapes ({milestones.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Vendors */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold">Prestataires récents</h3>
                  <VendorDialog weddingId={weddingId}>
                    <Button size="sm" variant="outline">Ajouter</Button>
                  </VendorDialog>
                </div>
                <div className="space-y-3">
                  {vendors.slice(0, 5).map((vendor) => (
                    <div key={vendor.id} className="flex items-start justify-between" data-testid={`vendor-${vendor.id}`}>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-muted-foreground">{vendor.category}</p>
                      </div>
                      <StatusBadge status={vendor.status} />
                    </div>
                  ))}
                  {vendors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun prestataire</p>
                  )}
                </div>
              </Card>

              {/* Quick Milestones */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold">Prochaines étapes</h3>
                  <MilestoneDialog weddingId={weddingId}>
                    <Button size="sm" variant="outline">Ajouter</Button>
                  </MilestoneDialog>
                </div>
                <div className="space-y-3">
                  {milestones.filter(m => !m.completed).slice(0, 5).map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-3" data-testid={`milestone-${milestone.id}`}>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {formatDate(milestone.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {milestones.filter(m => !m.completed).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune étape en attente</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prestataires" className="mt-6">
            <div className="flex justify-end mb-4">
              <VendorDialog weddingId={weddingId}>
                <Button data-testid="button-add-vendor">Ajouter un prestataire</Button>
              </VendorDialog>
            </div>
            <Link href={`/mariages/${weddingId}/prestataires`}>
              <Button variant="outline" className="w-full">Voir tous les prestataires</Button>
            </Link>
          </TabsContent>

          <TabsContent value="invites" className="mt-6">
            <Link href={`/mariages/${weddingId}/invites`}>
              <Button className="w-full">Gérer la liste des invités</Button>
            </Link>
          </TabsContent>

          <TabsContent value="paiements" className="mt-6">
            <div className="flex justify-end mb-4">
              <PaymentDialog weddingId={weddingId}>
                <Button data-testid="button-add-payment">Ajouter un paiement</Button>
              </PaymentDialog>
            </div>
            <Link href={`/mariages/${weddingId}/paiements`}>
              <Button variant="outline" className="w-full">Voir tous les paiements</Button>
            </Link>
          </TabsContent>

          <TabsContent value="contrats" className="mt-6">
            <div className="flex justify-end mb-4">
              <ContractDialog weddingId={weddingId}>
                <Button data-testid="button-add-contract">Ajouter un contrat</Button>
              </ContractDialog>
            </div>
            <Link href={`/mariages/${weddingId}/contrats`}>
              <Button variant="outline" className="w-full">Voir tous les contrats</Button>
            </Link>
          </TabsContent>

          <TabsContent value="etapes" className="mt-6">
            <div className="flex justify-end mb-4">
              <MilestoneDialog weddingId={weddingId}>
                <Button data-testid="button-add-milestone">Ajouter une étape</Button>
              </MilestoneDialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
