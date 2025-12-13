import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Activity, Droplet, TrendingUp, AlertCircle, Syringe } from 'lucide-react';
import GlucoseTrendChart from '@/components/GlucoseTrendChart';
import MetricCard from '@/components/MetricCard';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertHealthDataSchema } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function GlucoseInsulinPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('glucose');
  
  const form = useForm({
    resolver: zodResolver(insertHealthDataSchema),
    defaultValues: {
      glucose: 0,
      insulin: 0,
      carbs: 0,
      activityLevel: 'moderate',
      notes: '',
    },
  });

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['/api/health-data'],
  }) as { data?: any[], isLoading: boolean };

  const { data: latestPrediction } = useQuery({
    queryKey: ['/api/predictions/latest'],
  }) as { data?: any };

  const createHealthDataMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/health-data', { method: 'POST', body: JSON.stringify(data) });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('glucose.success'),
        description: t('glucose.readingRecorded'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('glucose.error'),
        description: error.message || t('glucose.failedToRecord'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    createHealthDataMutation.mutate(data);
  };

  const latestGlucose = (Array.isArray(healthData) && healthData.length > 0) ? healthData[0]?.glucose || 0 : 0;
  const latestInsulin = (Array.isArray(healthData) && healthData.length > 0) ? healthData[0]?.insulin || 0 : 0;
  const avgGlucose = (Array.isArray(healthData) && healthData.length > 0)
    ? Math.round(healthData.reduce((sum: number, item: any) => sum + (item.glucose || 0), 0) / healthData.length)
    : 0;
  const highReadings = Array.isArray(healthData) ? healthData.filter((item: any) => item.glucose > 180).length : 0;
  const lowReadings = Array.isArray(healthData) ? healthData.filter((item: any) => item.glucose < 70).length : 0;

  const getGlucoseStatus = (glucose: number) => {
    if (glucose < 70) return { status: 'Low', color: '#FF6B6B' };
    if (glucose > 180) return { status: 'High', color: '#FFB84D' };
    return { status: 'In Range', color: '#51CF66' };
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Glucose & Insulin</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">Glucose & Insulin Management</h1>
              <p className="text-muted-foreground">Monitor your glucose levels and insulin doses together</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('glucose.loadingData')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Statistics - 4 key metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <MetricCard
                    titleKey="glucose.current"
                    value={latestGlucose > 0 ? latestGlucose.toString() : '--'}
                    unit="mg/dL"
                    statusKey={latestGlucose > 0 ? `dashboard.metrics.status.${getGlucoseStatus(latestGlucose).status.toLowerCase().replace(' ', '')}` : 'dashboard.metrics.status.noData'}
                    icon={Droplet}
                    iconColor="#60A5FA"
                    badgeBgColor="rgba(96, 165, 250, 0.2)"
                    badgeTextColor="#60A5FA"
                  />
                  <MetricCard
                    titleKey="glucose.average"
                    value={avgGlucose > 0 ? avgGlucose.toString() : '--'}
                    unit="mg/dL"
                    statusKey={avgGlucose > 0 ? `dashboard.metrics.status.${getGlucoseStatus(avgGlucose).status.toLowerCase().replace(' ', '')}` : 'dashboard.metrics.status.noData'}
                    icon={TrendingUp}
                    iconColor="#A78BFA"
                    badgeBgColor="rgba(167, 139, 250, 0.2)"
                    badgeTextColor="#A78BFA"
                  />
                  <MetricCard
                    titleKey="glucose.highReadings"
                    value={highReadings.toString()}
                    unit=""
                    statusKey={highReadings > 0 ? 'dashboard.metrics.status.needsAttention' : 'dashboard.metrics.status.good'}
                    icon={AlertCircle}
                    iconColor="#FB923C"
                    badgeBgColor="rgba(251, 146, 60, 0.2)"
                    badgeTextColor="#FB923C"
                  />
                  <MetricCard
                    titleKey="glucose.lowReadings"
                    value={lowReadings.toString()}
                    unit=""
                    statusKey={lowReadings > 0 ? 'dashboard.metrics.status.needsAttention' : 'dashboard.metrics.status.good'}
                    icon={AlertCircle}
                    iconColor="#2DD4BF"
                    badgeBgColor="rgba(45, 212, 191, 0.2)"
                    badgeTextColor="#2DD4BF"
                  />
                </div>

                {/* Main Chart */}
                <GlucoseTrendChart />

                {/* Input and Recent Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 glass-card">
                    <CardHeader>
                      <CardTitle>Log Glucose & Insulin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="glucose"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Glucose (mg/dL)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter glucose reading"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="insulin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Insulin (units)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter insulin dose"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (grams)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter carb intake"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Add any notes"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={createHealthDataMutation.isPending}
                          >
                            {createHealthDataMutation.isPending ? 'Recording...' : 'Record Reading'}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Insulin Recommendation Card */}
                  {latestPrediction && (
                    <Card className="p-6 bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Syringe className="w-5 h-5 text-primary" />
                          Insulin Prediction
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-2">Recommended Dose</p>
                          <p className="text-4xl font-bold text-primary">
                            {(latestPrediction as any)?.prediction?.predictedInsulin?.toFixed(1) || '--'}
                            <span className="text-lg ml-2">units</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Confidence: {((latestPrediction as any)?.prediction?.confidence * 100)?.toFixed(0)}%
                          </p>
                        </div>
                        {(latestPrediction as any)?.prediction?.factors && (
                          <div className="pt-4 border-t border-border">
                            <p className="text-sm font-medium text-foreground mb-2">Factors Considered</p>
                            <div className="space-y-2">
                              {((latestPrediction as any)?.prediction?.factors as string[]).map((factor, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{factor}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Recent Readings */}
                <Card className="p-6 glass-card">
                  <CardHeader>
                    <CardTitle>Recent Readings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(healthData) && healthData.length > 0 ? (
                      <div className="space-y-3">
                        {healthData.slice(0, 5).map((entry: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                            <div>
                              <p className="text-sm font-medium">{entry.glucose} mg/dL</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-primary font-medium">{entry.insulin} units</p>
                              <p className="text-xs text-muted-foreground">{entry.carbs}g carbs</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No readings yet. Record your first reading above!</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
