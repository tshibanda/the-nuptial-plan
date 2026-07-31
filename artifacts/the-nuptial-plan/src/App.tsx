import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import Dashboard from '@/pages/dashboard';
import WeddingDetail from '@/pages/wedding-detail';
import NewWedding from '@/pages/new-wedding';
import GuestsPage from '@/pages/guests-page';
import VendorsPage from '@/pages/vendors-page';
import PaymentsPage from '@/pages/payments-page';
import ContractsPage from '@/pages/contracts-page';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/mariages/nouveau" component={NewWedding} />
        <Route path="/mariages/:id" component={WeddingDetail} />
        <Route path="/mariages/:id/invites" component={GuestsPage} />
        <Route path="/mariages/:id/prestataires" component={VendorsPage} />
        <Route path="/mariages/:id/paiements" component={PaymentsPage} />
        <Route path="/mariages/:id/contrats" component={ContractsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
