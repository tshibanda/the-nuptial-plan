import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WeddingProvider } from '@/lib/wedding-context';
import { AppShell } from '@/components/layout/app-shell';
import Dashboard from '@/pages/dashboard';
import Prestataires from '@/pages/prestataires';
import Invites from '@/pages/invites';
import Budget from '@/pages/budget';
import Calendrier from '@/pages/calendrier';
import Contrats from '@/pages/contrats';
import Paiements from '@/pages/paiements';
import Documents from '@/pages/documents';
import Parametres from '@/pages/parametres';
import JourJ from '@/pages/jour-j';
import NotFound from '@/pages/not-found';
import { PrivacyPage, PolicyPage } from '@/pages/legal';
import { LegalFooter } from '@/components/legal-footer';
import CarnetAdresse from '@/pages/carnet-adresse';
import Retroplanning from '@/pages/retroplanning';
import Moodboards from '@/pages/moodboards';
import Business from '@/pages/business';

// ── Clerk key & proxy ─────────────────────────────────────────────────────────
// REQUIRED — copy verbatim. Resolves from hostname so one build serves multiple domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
// REQUIRED — unconditional. Empty in dev (intentional), auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clerk passes full paths; wouter's setLocation prepends base — strip to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// ── Clerk appearance — Jardin Parisien charter ────────────────────────────────
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/tnp-gold-logo.png`,
  },
  variables: {
    colorPrimary: '#5D2D5D',           // prune
    colorForeground: '#1A091A',        // prune-noir
    colorMutedForeground: '#716471',   // gris lilas
    colorDanger: '#c0392b',
    colorBackground: '#FDF9FD',        // blanc rosé
    colorInput: '#F8F3EE',             // crème chaude
    colorInputForeground: '#1A091A',
    colorNeutral: '#D7CDD7',           // lilas discret
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '8px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#FDF9FD] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[#D7CDD7]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1A091A] font-serif',
    headerSubtitle: 'text-[#716471]',
    socialButtonsBlockButtonText: 'text-[#1A091A]',
    formFieldLabel: 'text-[#1A091A]',
    footerActionLink: 'text-[#5D2D5D] hover:text-[#3C1A3C]',
    footerActionText: 'text-[#716471]',
    dividerText: 'text-[#716471]',
    identityPreviewEditButton: 'text-[#5D2D5D]',
    formFieldSuccessText: 'text-[#649064]',
    alertText: 'text-[#1A091A]',
    logoBox: 'mb-2',
    logoImage: 'h-12 w-auto',
    socialButtonsBlockButton: 'border-[#D7CDD7] bg-[#F8F3EE] hover:bg-[#F0E8F0]',
    formButtonPrimary: 'bg-[#5D2D5D] hover:bg-[#3C1A3C] text-white',
    formFieldInput: 'bg-[#F8F3EE] border-[#D7CDD7] text-[#1A091A]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#D7CDD7]',
    alert: 'bg-[#F5EFF5] border-[#D7CDD7]',
    otpCodeFieldInput: 'border-[#D7CDD7] bg-[#F8F3EE]',
    formFieldRow: 'gap-2',
    main: 'gap-4',
  },
};

// ── Query client ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

// ── Invalidate QueryClient when user changes ──────────────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

// ── Sign-in / Sign-up pages ───────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8F3EE] px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/`}
      />
      <LegalFooter className="mt-6" />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8F3EE] px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/`}
      />
      <LegalFooter className="mt-6" />
    </div>
  );
}

// ── Landing page (unauthenticated visitors at /) ──────────────────────────────
function LandingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8F3EE] px-6 text-center">
      {/* Logo */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center">
        <img
          src="/tnp-gold-logo.png"
          alt="The Nuptial Plan"
          className="h-full w-full object-contain"
        />
      </div>

      <h1 className="mb-2 font-serif text-4xl text-[#3C1A3C]">The Nuptial Plan</h1>
      <p className="mb-10 text-sm uppercase tracking-[0.2em] text-[#716471]">
        Pour que rien ne manque à votre bonheur
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`${basePath}/sign-in`}
          className="inline-flex items-center justify-center rounded-lg bg-[#5D2D5D] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3C1A3C]"
        >
          Se connecter
        </a>
        <a
          href={`${basePath}/sign-up`}
          className="inline-flex items-center justify-center rounded-lg border border-[#D7CDD7] bg-white px-8 py-3 text-sm font-medium text-[#5D2D5D] transition-colors hover:bg-[#F5EFF5]"
        >
          Créer un compte
        </a>
      </div>

      <p className="mt-12 text-xs text-[#9B7E9B]">
        Atelier de planification nuptiale · Accès réservé aux planners
      </p>
    </div>
  );
}

// ── Protected app shell ───────────────────────────────────────────────────────
function AuthenticatedApp() {
  return (
    <WeddingProvider>
      <TooltipProvider>
        <AppShell>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/prestataires" component={Prestataires} />
            <Route path="/carnet-adresse" component={CarnetAdresse} />
            <Route path="/retroplanning" component={Retroplanning} />
            <Route path="/moodboards" component={Moodboards} />
            <Route path="/business" component={Business} />
            <Route path="/invites" component={Invites} />
            <Route path="/budget" component={Budget} />
            <Route path="/calendrier" component={Calendrier} />
            <Route path="/contrats" component={Contrats} />
            <Route path="/paiements" component={Paiements} />
            <Route path="/documents" component={Documents} />
            <Route path="/parametres" component={Parametres} />
            <Route path="/jour-j" component={JourJ} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </TooltipProvider>
    </WeddingProvider>
  );
}

// ── Root router ───────────────────────────────────────────────────────────────
function AppRouter() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/policy" component={PolicyPage} />
      {/* REQUIRED — exactly /*? — matches bare URL and Clerk's OAuth sub-paths */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Everything else: show app if signed-in, landing if at root, sign-in redirect otherwise */}
      <Route>
        <Show when="signed-in">
          <AuthenticatedApp />
        </Show>
        <Show when="signed-out">
          {location === '/' ? <LandingPage /> : <Redirect to="/sign-in" />}
        </Show>
      </Route>
    </Switch>
  );
}

// ── ClerkProvider wired to wouter ─────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Connexion',
            subtitle: 'Accédez à votre espace de planification',
          },
        },
        signUp: {
          start: {
            title: 'Créer un compte',
            subtitle: 'Rejoignez The Nuptial Plan',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppRouter />
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
