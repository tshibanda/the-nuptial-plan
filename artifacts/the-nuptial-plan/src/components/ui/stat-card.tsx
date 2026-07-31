import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'accent' | 'destructive';
}

export function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const colorClass = {
    default: 'text-foreground',
    primary: 'text-primary',
    accent: 'text-accent',
    destructive: 'text-destructive',
  }[variant];

  return (
    <Card className="p-6 border-2">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm uppercase tracking-wider font-mono text-muted-foreground">{label}</p>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <p className={`text-3xl font-display font-semibold ${colorClass}`}>{value}</p>
    </Card>
  );
}
