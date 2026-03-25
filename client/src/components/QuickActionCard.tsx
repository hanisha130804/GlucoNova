import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBgColor?: string;
  iconColor?: string;
}

export default function QuickActionCard({ 
  icon: Icon, 
  title, 
  description,
  iconBgColor = 'rgba(33, 200, 155, 0.2)',
  iconColor = '#21C89B'
}: QuickActionCardProps) {
  return (
    <Card 
      className="p-5 card-interactive glass-card cursor-pointer" 
      onClick={() => console.log(`${title} clicked`)}
      data-testid={`card-action-${title.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBgColor }}
        >
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-base text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}