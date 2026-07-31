import { Link, useRoute } from 'wouter';
import { Home, Plus, FileText } from 'lucide-react';
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
      className={`block px-4 py-3 text-sm transition-colors border-l-2 ${
        isActive
          ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-border'
      }`}
    >
      <div className="font-medium truncate">{wedding.coupleName}</div>
      <div className="text-xs text-muted-foreground font-mono mt-0.5">
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
    <div className="min-h-[100dvh] flex bg-background paper-texture">
      {/* Sidebar */}
      <aside className="w-72 border-r-2 border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-6 border-b-2 border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-sidebar-primary" />
            <h1 className="font-display text-2xl text-sidebar-foreground">
              The Nuptial Plan
            </h1>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">
            Élise Caron · Directrice artistique
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            <Link
              href="/"
              data-testid="link-home"
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                isHome
                  ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-border'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="uppercase tracking-wider font-mono text-xs">Tableau de bord</span>
            </Link>

            {weddings.length > 0 && (
              <>
                <Separator className="my-6 bg-sidebar-border" />
                <div className="space-y-1">
                  <p className="px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    Dossiers actifs
                  </p>
                  {weddings.slice(0, 10).map((wedding) => (
                    <WeddingSidebarLink key={wedding.id} wedding={wedding} />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t-2 border-sidebar-border">
          <Link href="/mariages/nouveau" data-testid="link-new-wedding">
            <Button
              className="w-full uppercase tracking-wider font-mono text-xs"
              variant={isNewWedding ? 'default' : 'outline'}
              data-testid="button-new-wedding"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau dossier
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
