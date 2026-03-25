import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MetricCardProps {
  title?: string;
  titleKey?: string;
  value: string;
  unit: string;
  status?: string;
  statusKey?: string;
  icon: LucideIcon;
  statusVariant?: 'default' | 'secondary' | 'destructive';
  iconColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export default function MetricCard({ 
  title,
  titleKey, 
  value, 
  unit, 
  status,
  statusKey, 
  icon: Icon,
  statusVariant = 'default',
  iconColor = '#21C89B',
  badgeBgColor = 'rgba(33, 200, 155, 0.2)',
  badgeTextColor = '#21C89B'
}: MetricCardProps) {
  const { t } = useTranslation();
  
  // Use translation if titleKey is provided, otherwise use title directly
  const displayTitle = titleKey ? t(titleKey) : (title || '');
  const displayStatus = statusKey ? t(statusKey) : (status || '');
  
  // Create a safe test ID from the display title
  const testId = displayTitle ? displayTitle.toLowerCase().replace(/\s+/g, '-') : 'metric';
  
  return (
    <Card 
      className="p-5 card-interactive glass-card flex flex-col justify-between" 
      style={{ height: '110px' }} 
      data-testid={`card-metric-${testId}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{displayTitle}</p>
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-3xl font-bold text-foreground leading-none">{value}</h3>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <Badge 
        variant={statusVariant} 
        className="text-xs px-2 py-0.5 w-fit"
        style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
        data-testid={`badge-status-${testId}`}
      >
        {displayStatus}
      </Badge>
    </Card>
  );
}