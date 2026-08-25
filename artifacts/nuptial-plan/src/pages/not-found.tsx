import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function NotFound() {
  const { language } = useLanguage();
  const text = language === 'fr'
    ? {
        title: 'Page introuvable',
        description: 'La page demandée n’existe pas ou a été déplacée.',
      }
    : {
        title: 'Page not found',
        description: 'The page you requested does not exist or has been moved.',
      };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 {text.title}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {text.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
