import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { WeddingProvider } from '@/lib/wedding-context';
import { AppShell } from '@/components/layout/app-shell';
import Dashboard from '@/pages/dashboard';
import Prestataires from '@/pages/prestataires';
import Invites from '@/pages/invites';
import Budget from '@/pages/budget';
import Calendrier from '@/pages/calendrier';
import Contrats from '@/pages/contrats';
import Paiements from '@/pages/paiements';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/prestataires" component={Prestataires} />
        <Route path="/invites" component={Invites} />
        <Route path="/budget" component={Budget} />
        <Route path="/calendrier" component={Calendrier} />
        <Route path="/contrats" component={Contrats} />
        <Route path="/paiements" component={Paiements} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WeddingProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </WeddingProvider>
    </QueryClientProvider>
  );
}

export default App;
