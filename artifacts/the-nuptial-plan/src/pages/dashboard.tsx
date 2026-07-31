import { useGetDashboardOverview, useListWeddings } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Calendar, Euro, FileText, Clock, Users, Plus } from 'lucide-react';
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
      <div className="p-12 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-5 w-[32rem]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!overview || !weddings) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground font-mono">Erreur de chargement des données.</p>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-3 opacity-0 animate-fade-in-up border-b-2 border-border pb-6">
        <h1 className="text-5xl font-display font-semibold tracking-tight">Registre général</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
          Vue d'ensemble · Tous dossiers · {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-0 animate-fade-in-up animate-delay-100">
        <StatCard
          label="Dossiers actifs"
          value={overview.totalWeddings}
          icon={FileText}
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
      <div className="space-y-6 opacity-0 animate-fade-in-up animate-delay-200">
        <div className="flex items-center justify-between border-b-2 border-border pb-4">
          <h2 className="text-3xl font-display font-semibold">Dossiers de mariage</h2>
          <Link href="/mariages/nouveau" data-testid="link-create-wedding">
            <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau dossier
            </Button>
          </Link>
        </div>

        {weddings.length === 0 ? (
          <Card className="p-16 text-center border-2 border-dashed" data-testid="empty-weddings">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-2xl font-display font-semibold mb-3">Aucun dossier</h3>
            <p className="text-muted-foreground mb-8 font-mono text-sm">
              Commencez par créer votre premier dossier de mariage
            </p>
            <Link href="/mariages/nouveau">
              <Button size="lg" className="uppercase tracking-wider font-mono text-xs">
                <Plus className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weddings.map((wedding) => (
              <Link key={wedding.id} href={`/mariages/${wedding.id}`} data-testid={`link-wedding-${wedding.id}`}>
                <Card className="p-0 hover-elevate transition-all duration-200 border-2 overflow-hidden h-full flex flex-col">
                  {wedding.venueImageUrl && (
                    <div className="w-full h-48 bg-muted border-b-2 border-border overflow-hidden">
                      <img
                        src={wedding.venueImageUrl}
                        alt={wedding.venue}
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-display text-2xl font-semibold mb-2 leading-tight">
                      {wedding.coupleName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 font-mono uppercase tracking-wide">
                      {wedding.venue}
                    </p>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{formatDate(wedding.weddingDate)}</span>
                      </div>
                      <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider rounded border border-primary/20">
                        {getDaysUntilText(wedding.weddingDate)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Milestones */}
      {overview.upcomingMilestones.length > 0 && (
        <div className="space-y-6 opacity-0 animate-fade-in-up animate-delay-300">
          <div className="border-b-2 border-border pb-4">
            <h2 className="text-3xl font-display font-semibold">Prochaines échéances</h2>
          </div>
          <Card className="divide-y-2 divide-border border-2">
            {overview.upcomingMilestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="p-6 flex items-start gap-6" data-testid={`milestone-${milestone.id}`}>
                <div
                  className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                    milestone.completed ? 'bg-secondary' : 'bg-border'
                  }`}
                />
                <div className="flex-1">
                  <p className="font-display text-lg font-semibold mb-1">{milestone.title}</p>
                  {milestone.detail && (
                    <p className="text-sm text-muted-foreground mb-3">{milestone.detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                    Échéance · {formatDate(milestone.dueDate)}
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
