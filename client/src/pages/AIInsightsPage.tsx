import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, AlertTriangle, CheckCircle, Brain, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function AIInsightsPage() {
  const { data: healthData } = useQuery({
    queryKey: ['/api/health-data'],
  }) as { data?: { data?: any[] } };

  const { data: predictions } = useQuery({
    queryKey: ['/api/predictions/latest'],
  }) as { data?: { prediction?: { predictedInsulin?: number } } };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Zap className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">AI Insights</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">AI-Powered Health Insights</h1>
            <p className="text-muted-foreground">Personalized predictions and recommendations based on your health data</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Glucose Prediction */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Glucose Trend Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {((predictions as any)?.prediction?.predictedInsulin as number) || 'N/A'}
                    </div>
                    <p className="text-sm text-muted-foreground">Predicted next reading (mg/dL)</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-2">AI Confidence: High</p>
                    <p className="text-xs text-muted-foreground">
                      Based on your recent patterns, we predict your glucose will remain stable.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pattern Detection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Pattern Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Consistent Morning Levels</p>
                      <p className="text-xs text-muted-foreground">Your fasting glucose has been stable for 7 days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Post-Lunch Spikes Detected</p>
                      <p className="text-xs text-muted-foreground">Consider reducing carb intake at lunch</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Exercise Impact</p>
                      <p className="text-xs text-muted-foreground">Physical activity correlates with better control</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personalized Recommendations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold mb-2">Meal Timing</h4>
                    <p className="text-sm text-muted-foreground">Eat dinner earlier (before 7 PM) to improve overnight glucose control</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold mb-2">Insulin Adjustment</h4>
                    <p className="text-sm text-muted-foreground">Consider reducing bolus by 1 unit for meals under 40g carbs</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold mb-2">Activity Goal</h4>
                    <p className="text-sm text-muted-foreground">Aim for 30 minutes of walking after lunch for optimal results</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
