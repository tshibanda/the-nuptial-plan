import { Link, useRoute } from 'wouter';
import { Home, Plus, Calendar } from 'lucide-react';
import { useListWeddings } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatShortDate } from '@/lib/format';

function WeddingSidebarLink({ wedding }: { wedding: { id: number; coupleName: string; weddingDate: string } }) {
  const [isActive] = useRoute(`/mariages/${wedding.id}`);
  return (
    <Link
      href={`/mariages/${wedding.id}`}
      data-testid={`link-sidebar-wedding-${wedding.id}`}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      <div className="font-medium truncate">{wedding.coupleName}</div>
      <div className="text-xs text-muted-foreground font-mono">
        {formatShortDate(wedding.weddingDate)}
      </div>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: weddings = [] } = useListWeddings();
  const [isHome] = useRoute('/');
  const [isNewWedding] = useRoute('/mariages/nouveau');

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-display text-2xl text-sidebar-foreground">
            The Nuptial Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Élise Caron, Directrice artistique
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            <Link
              href="/"
              data-testid="link-home"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isHome
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <Home className="w-4 h-4" />
              Tableau de bord
            </Link>

            {weddings.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Mariages actifs
                  </p>
                  {weddings.slice(0, 10).map((wedding) => (
                    <WeddingSidebarLink key={wedding.id} wedding={wedding} />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border">
          <Link href="/mariages/nouveau" data-testid="link-new-wedding">
            <Button
              className="w-full"
              variant={isNewWedding ? 'default' : 'outline'}
              data-testid="button-new-wedding"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau mariage
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
