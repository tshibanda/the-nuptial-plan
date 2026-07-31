import { Badge } from '@/components/ui/badge';

type StatusValue =
  | 'Confirmé'
  | 'En attente'
  | 'Décliné'
  | 'Contrat en attente'
  | 'Acompte versé'
  | 'Résilié'
  | 'Urgent'
  | 'À régler'
  | 'Programmé'
  | 'Payé'
  | 'Signé'
  | 'Partiel';

interface StatusBadgeProps {
  status: StatusValue;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Confirmé':
      case 'Signé':
      case 'Payé':
        return 'secondary';
      case 'Urgent':
      case 'Résilié':
      case 'Décliné':
        return 'destructive';
      case 'Acompte versé':
      case 'Programmé':
      case 'Partiel':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getVariant()} className="font-mono text-xs uppercase tracking-wide">
      {status}
    </Badge>
  );
}
