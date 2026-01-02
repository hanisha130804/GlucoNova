import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Activity, Heart, Footprints, Timer } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Activity & Lifestyle</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">Activity Tracking</h1>
            <p className="text-muted-foreground">Monitor your physical activity and its impact on glucose levels</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Footprints className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Steps</p>
                    <p className="text-2xl font-bold">8,432</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Minutes</p>
                    <p className="text-2xl font-bold">45 min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <Heart className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Heart Rate</p>
                    <p className="text-2xl font-bold">72 bpm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Impact on Glucose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-semibold">Morning Walk</p>
                    <p className="text-sm text-muted-foreground">30 min • 7:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-500">-15 mg/dL</p>
                    <p className="text-xs text-muted-foreground">Glucose reduction</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-semibold">Gym Session</p>
                    <p className="text-sm text-muted-foreground">45 min • 5:30 PM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-500">-22 mg/dL</p>
                    <p className="text-xs text-muted-foreground">Glucose reduction</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
