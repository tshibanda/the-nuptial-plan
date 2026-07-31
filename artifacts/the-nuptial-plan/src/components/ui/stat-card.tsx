import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  variant?: 'default' | 'primary' | 'accent' | 'destructive';
}

export function StatCard({ label, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-card-border',
    primary: 'border-primary/20 bg-primary/5',
    accent: 'border-accent/20 bg-accent/5',
    destructive: 'border-destructive/20 bg-destructive/5',
  };

  return (
    <Card className={`p-6 ${variantStyles[variant]}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-display font-semibold mt-2">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${variant === 'default' ? 'bg-muted' : ''}`}>
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}
