import { Badge } from '@/components/ui/badge';

type StatusType = 
  | 'Confirmé' 
  | 'Contrat en attente' 
  | 'Acompte versé' 
  | 'Résilié'
  | 'En attente'
  | 'Décliné'
  | 'Urgent'
  | 'À régler'
  | 'Programmé'
  | 'Payé'
  | 'Signé'
  | 'Partiel';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'Confirmé': { variant: 'default', label: 'Confirmé' },
  'Contrat en attente': { variant: 'secondary', label: 'Contrat en attente' },
  'Acompte versé': { variant: 'outline', label: 'Acompte versé' },
  'Résilié': { variant: 'destructive', label: 'Résilié' },
  'En attente': { variant: 'secondary', label: 'En attente' },
  'Décliné': { variant: 'destructive', label: 'Décliné' },
  'Urgent': { variant: 'destructive', label: 'Urgent' },
  'À régler': { variant: 'secondary', label: 'À régler' },
  'Programmé': { variant: 'outline', label: 'Programmé' },
  'Payé': { variant: 'default', label: 'Payé' },
  'Signé': { variant: 'default', label: 'Signé' },
  'Partiel': { variant: 'outline', label: 'Partiel' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: 'outline' as const, label: status };
  
  return (
    <Badge variant={config.variant} className={className} data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
      {config.label}
    </Badge>
  );
}
