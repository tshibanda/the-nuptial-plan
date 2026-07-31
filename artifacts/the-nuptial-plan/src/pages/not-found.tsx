import { Link } from 'wouter';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-12 text-center border-2">
        <FileQuestion className="w-24 h-24 mx-auto text-muted-foreground mb-8" />
        <h1 className="text-6xl font-display font-semibold mb-4">404</h1>
        <h2 className="text-2xl font-display font-semibold mb-3 uppercase tracking-wide">
          Page introuvable
        </h2>
        <p className="text-muted-foreground mb-8 font-mono text-sm">
          La page que vous recherchez n'existe pas dans le registre.
        </p>
        <Link href="/">
          <Button size="lg" className="uppercase tracking-wider font-mono text-xs">
            <Home className="w-4 h-4 mr-2" />
            Retour au registre
          </Button>
        </Link>
      </Card>
    </div>
  );
}
