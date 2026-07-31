import { useGetDashboardOverview, useListWeddings } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Calendar, Euro, FileText, Clock, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getDaysUntilText } from '@/lib/format';

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverview();
  const { data: weddings, isLoading: weddingsLoading } = useListWeddings();

  if (overviewLoading || weddingsLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!overview || !weddings) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Erreur de chargement des données.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 opacity-0 animate-fade-in-up">
        <h1 className="text-4xl font-display font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de tous vos mariages et tâches en cours
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-0 animate-fade-in-up animate-delay-100">
        <StatCard
          label="Mariages actifs"
          value={overview.totalWeddings}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          label="Budget engagé"
          value={formatCurrency(overview.totalBudgetCommitted)}
          icon={Euro}
        />
        <StatCard
          label="Paiements en attente"
          value={overview.pendingPaymentsCount}
          icon={Clock}
          variant={overview.pendingPaymentsCount > 0 ? 'accent' : 'default'}
        />
        <StatCard
          label="Contrats non signés"
          value={overview.pendingContractsCount}
          icon={FileText}
          variant={overview.pendingContractsCount > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Upcoming Weddings */}
      <div className="space-y-4 opacity-0 animate-fade-in-up animate-delay-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-semibold">Mariages à venir</h2>
          <Link href="/mariages/nouveau" data-testid="link-create-wedding">
            <Button variant="outline" size="sm">
              Nouveau mariage
            </Button>
          </Link>
        </div>

        {weddings.length === 0 ? (
          <Card className="p-12 text-center" data-testid="empty-weddings">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">Aucun mariage</h3>
            <p className="text-muted-foreground mb-6">
              Commencez par créer votre premier mariage
            </p>
            <Link href="/mariages/nouveau">
              <Button>Créer un mariage</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weddings.map((wedding) => (
              <Link key={wedding.id} href={`/mariages/${wedding.id}`} data-testid={`link-wedding-${wedding.id}`}>
                <Card className="p-6 hover-elevate transition-all duration-300 hover:shadow-md cursor-pointer">
                  {wedding.venueImageUrl && (
                    <div className="w-full h-40 mb-4 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={wedding.venueImageUrl}
                        alt={wedding.venue}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-display text-xl font-semibold mb-1">
                    {wedding.coupleName}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {wedding.venue}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">{formatDate(wedding.weddingDate)}</span>
                  </div>
                  <p className="text-xs text-primary mt-2 font-medium">
                    {getDaysUntilText(wedding.weddingDate)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Milestones */}
      {overview.upcomingMilestones.length > 0 && (
        <div className="space-y-4 opacity-0 animate-fade-in-up animate-delay-300">
          <h2 className="text-2xl font-display font-semibold">Prochaines étapes</h2>
          <Card className="divide-y divide-border">
            {overview.upcomingMilestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="p-4 flex items-start gap-4" data-testid={`milestone-${milestone.id}`}>
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    milestone.completed ? 'bg-primary' : 'bg-muted-foreground'
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium">{milestone.title}</p>
                  {milestone.detail && (
                    <p className="text-sm text-muted-foreground mt-1">{milestone.detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    {formatDate(milestone.dueDate)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
