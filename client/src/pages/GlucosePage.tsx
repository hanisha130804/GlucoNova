import { useState, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { useLocation } from 'wouter';
import { Activity, Droplet, TrendingUp, AlertCircle, Info, Calendar, Clock, RefreshCw } from 'lucide-react';
import GlucoseTrendChart from '@/components/GlucoseTrendChart';
import MetricCard from '@/components/MetricCard';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function GlucosePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Form state
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [glucose, setGlucose] = useState('');
  const [insulinTaken, setInsulinTaken] = useState(false);
  const [insulinType, setInsulinType] = useState('');
  const [insulinDose, setInsulinDose] = useState('');
  const [foodConsumed, setFoodConsumed] = useState(false);
  const [mealType, setMealType] = useState('');
  const [carbs, setCarbs] = useState('');
  const [foodNotes, setFoodNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Check if user is in skip-auth mode
  useEffect(() => {
    const skipAuth = localStorage.getItem('skipAuth');
    const token = localStorage.getItem('token');
    
    if (skipAuth === 'true' || !token) {
      toast({
        title: 'Authentication Required',
        description: 'Please complete registration to access glucose tracking features.',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [navigate, toast]);

  const { data: healthDataResponse, isLoading } = useQuery({
    queryKey: ['/api/health-data'],
  });

  // Extract the actual data array from the response
  const healthData = (healthDataResponse as any)?.data || [];

  const createHealthDataMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/health-data', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reading Saved',
        description: 'Your glucose reading has been recorded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      // Reset form
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().slice(0, 5));
      setGlucose('');
      setInsulinTaken(false);
      setInsulinType('');
      setInsulinDose('');
      setFoodConsumed(false);
      setMealType('');
      setCarbs('');
      setFoodNotes('');
      setNotes('');
    },
    onError: (error: any) => {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save glucose reading. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate glucose
    const glucoseValue = parseFloat(glucose);
    if (!glucose || isNaN(glucoseValue) || glucoseValue < 40 || glucoseValue > 400) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid glucose value between 40 and 400 mg/dL.',
        variant: 'destructive',
      });
      return;
    }

    // Create timestamp from date and time
    const timestamp = new Date(`${date}T${time}`).toISOString();

    // Build payload - simplified structure
    const payload: any = {
      glucose: glucoseValue,
      timestamp,
      insulin: insulinTaken ? parseFloat(insulinDose) || 0 : 0,
      carbs: foodConsumed ? parseFloat(carbs) || 0 : 0,
      notes: notes || undefined,
    };

    console.log('Submitting payload:', payload);
    createHealthDataMutation.mutate(payload);
  };

  const latestGlucose = healthData[0]?.glucose || 0;
  const avgGlucose = healthData.length > 0 
    ? Math.round(healthData.reduce((sum: number, item: any) => sum + item.glucose, 0) / healthData.length)
    : 0;
  const highReadings = healthData.filter((item: any) => item.glucose > 180).length || 0;
  const lowReadings = healthData.filter((item: any) => item.glucose < 70).length || 0;

  const getGlucoseStatus = (glucose: number) => {
    if (glucose < 70) return { status: 'Low', color: '#FF6B6B' };
    if (glucose > 180) return { status: 'High', color: '#FFB84D' };
    return { status: 'In Range', color: '#51CF66' };
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('glucose.title')}</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('glucose.title')}</h1>
              <p className="text-muted-foreground">{t('glucose.subtitle')}</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('glucose.loadingData')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Statistics */}
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
                  <Card className="glass-card card-gradient-blue">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-cyan-400" />
                        Log Glucose Reading
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Date & Time Section */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">Missed an entry? You can add readings for past dates and times.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <Input 
                              type="date" 
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              required
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Time
                            </Label>
                            <Input 
                              type="time" 
                              value={time}
                              onChange={(e) => setTime(e.target.value)}
                              required
                              className="h-11"
                            />
                          </div>
                        </div>

                        {/* Glucose - Always Required */}
                        <div className="space-y-2">
                          <Label className="text-base font-semibold text-white">
                            Glucose (mg/dL) <span className="text-rose-400">*</span>
                          </Label>
                          <Input
                            type="number"
                            placeholder="Enter glucose reading (40-400)"
                            value={glucose}
                            onChange={(e) => setGlucose(e.target.value)}
                            min="40"
                            max="400"
                            required
                            className="text-lg h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          />
                          <p className="text-sm text-cyan-300">Valid range: 40-400 mg/dL</p>
                        </div>

                        {/* Insulin Section - Conditional */}
                        <div className="space-y-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-base font-semibold">I took insulin</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">Enter insulin only if it was actually taken and prescribed by your doctor.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Switch
                              checked={insulinTaken}
                              onCheckedChange={setInsulinTaken}
                            />
                          </div>

                          {insulinTaken && (
                            <div className="space-y-4 pl-4 border-l-2 border-blue-500/30">
                              <div className="space-y-2">
                                <Label>Insulin Type</Label>
                                <Select value={insulinType} onValueChange={setInsulinType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select insulin type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Rapid-acting">Rapid-acting (Lispro/Aspart)</SelectItem>
                                    <SelectItem value="Short-acting">Short-acting</SelectItem>
                                    <SelectItem value="Long-acting">Long-acting (Basal)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Dose (units)</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  placeholder="Enter dose"
                                  value={insulinDose}
                                  onChange={(e) => setInsulinDose(e.target.value)}
                                  className="h-11"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Carbs Section - Conditional */}
                        <div className="space-y-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-base font-semibold">I ate food</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">Carbohydrate logging helps explain post-meal glucose changes.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Switch
                              checked={foodConsumed}
                              onCheckedChange={setFoodConsumed}
                            />
                          </div>

                          {foodConsumed && (
                            <div className="space-y-4 pl-4 border-l-2 border-green-500/30">
                              <div className="space-y-2">
                                <Label>Meal Type</Label>
                                <Select value={mealType} onValueChange={setMealType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select meal type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                                    <SelectItem value="Lunch">Lunch</SelectItem>
                                    <SelectItem value="Dinner">Dinner</SelectItem>
                                    <SelectItem value="Snack">Snack</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Carbs (grams)</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter carbs"
                                  value={carbs}
                                  onChange={(e) => setCarbs(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Food Notes (optional)</Label>
                                <Textarea
                                  placeholder="What did you eat?"
                                  className="resize-none"
                                  value={foodNotes}
                                  onChange={(e) => setFoodNotes(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* General Notes */}
                        <div className="space-y-2">
                          <Label>Additional Notes (optional)</Label>
                          <Textarea
                            placeholder="Any additional context (exercise, stress, etc.)"
                            className="resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-cyan-500/50 transition-all"
                          disabled={createHealthDataMutation.isPending}
                        >
                          {createHealthDataMutation.isPending ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Saving Reading...
                            </>
                          ) : (
                            'Save Glucose Reading'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="p-6 glass-card card-gradient-green">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        {t('glucose.recentReadings')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {((healthData as any[]) ?? [])?.slice(0, 8).map((reading: any, index: number) => {
                          const status = getGlucoseStatus(reading.glucose);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/10 backdrop-blur border border-white/20 hover:bg-white/15 transition-all">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <span className="font-semibold text-white">{reading.glucose} mg/dL</span>
                                  <span className="text-xs text-emerald-300">({status.status})</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(reading.timestamp).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        }) || (
                          <p className="text-sm text-gray-400 text-center py-8">
                            {t('glucose.noReadings')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
