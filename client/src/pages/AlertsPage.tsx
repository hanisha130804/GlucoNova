import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function AlertsPage() {
  const alerts = [
    { id: 1, type: 'critical', title: 'Low Glucose Alert', message: 'Your glucose dropped to 65 mg/dL at 2:30 PM', time: '30 min ago', icon: AlertTriangle },
    { id: 2, type: 'warning', title: 'Medication Reminder', message: 'Time to take your evening insulin dose', time: '1 hour ago', icon: Bell },
    { id: 3, type: 'success', title: 'Goal Achieved', message: 'You maintained Time in Range above 80% for 7 days!', time: '2 hours ago', icon: CheckCircle },
    { id: 4, type: 'info', title: 'Appointment Tomorrow', message: 'Dr. Smith appointment scheduled at 10:00 AM', time: '5 hours ago', icon: Info },
  ];

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500' };
      case 'warning': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-500' };
      case 'success': return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500' };
      default: return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' };
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Alerts & Notifications</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">Notifications</h1>
            <p className="text-muted-foreground">Stay informed about your health status and reminders</p>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => {
              const colors = getAlertColor(alert.type);
              const Icon = alert.icon;
              return (
                <Card key={alert.id} className={`${colors.bg} ${colors.border} border transition-all hover:scale-[1.01]`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <span className="text-xs text-muted-foreground">{alert.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
