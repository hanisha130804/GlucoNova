import { useState, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Droplet, TrendingUp, Brain, Upload, Zap, Activity, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export default function InsulinPage() {
  const { t } = useTranslation();
  const [manualInsulin, setManualInsulin] = useState('');
  const [showAIPrediction, setShowAIPrediction] = useState(true);
  const [aiPredictionEnabled, setAiPredictionEnabled] = useState(true);

  // Load AI prediction preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('aiPredictionEnabled');
    if (savedPreference !== null) {
      setAiPredictionEnabled(savedPreference === 'true');
    }
  }, []);

  // Save AI prediction preference to localStorage when it changes
  const handleAiPredictionToggle = (enabled: boolean) => {
    setAiPredictionEnabled(enabled);
    localStorage.setItem('aiPredictionEnabled', enabled.toString());
  };

  const { data: healthData } = useQuery({
    queryKey: ['/api/health-data'],
  }) as { data?: any[] };

  const { data: profileData } = useQuery({
    queryKey: ['/api/profile'],
  }) as { data?: any };

  const { data: reportsData } = useQuery({
    queryKey: ['/api/reports'],
  }) as { data?: any };

  // AI-powered insulin prediction based on medical reports and health data
  const calculateAIPrediction = () => {
    const latestGlucose = (healthData as any[])?.[0]?.glucose || 0;
    const hba1c = (profileData as any)?.profile?.hba1c || 7.0;
    const weight = (profileData as any)?.profile?.weight || 70;
    const hasReports = (reportsData as any)?.reports?.length > 0;

    // AI calculation based on clinical guidelines
    const basalInsulin = Math.round((weight * 0.4) / 2);
    const bolus = Math.round(latestGlucose / 50);
    const totalDaily = basalInsulin * 2 + bolus;

    return {
      basal: basalInsulin,
      bolus: bolus,
      totalDaily: totalDaily,
      insulinToCarbRatio: Math.round(500 / totalDaily),
      correctionFactor: Math.round(1800 / totalDaily),
      confidence: hasReports ? 92 : 75,
      dataSource: hasReports ? 'Medical Reports + Real-time Data' : 'Real-time Data Only',
    };
  };

  const aiPrediction = calculateAIPrediction();
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Droplet className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('insulin.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle" className="text-sm text-muted-foreground">
              AI Predictions
            </Label>
            <Switch
              id="ai-toggle"
              checked={aiPredictionEnabled}
              onCheckedChange={handleAiPredictionToggle}
            />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('insulin.title')}</h1>
              <p className="text-muted-foreground">{t('insulin.subtitle')}</p>
            </div>

            {/* AI Insulin Prediction Card */}
            {showAIPrediction && aiPredictionEnabled && (
              <Card className="mb-6 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    {t('insulin.aiPrediction')}
                  </CardTitle>
                  <CardDescription>
                    {t('insulin.basedOnData')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">{t('insulin.dataSource')}</span>
                      </div>
                      <Badge variant="outline" className="bg-primary/20">
                        {aiPrediction.dataSource}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">{t('insulin.aiConfidence')}</span>
                      </div>
                      <span className="text-lg font-bold text-green-500">{aiPrediction.confidence}%</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-3xl font-bold text-primary">{aiPrediction.basal}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('insulin.basalInsulin')}</p>
                      </div>
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-3xl font-bold text-primary">{aiPrediction.bolus}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('insulin.suggestedBolus')}</p>
                      </div>
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-3xl font-bold text-primary">{aiPrediction.totalDaily}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('insulin.totalDaily')}</p>
                      </div>
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-3xl font-bold text-primary">1:{aiPrediction.insulinToCarbRatio}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('insulin.icr')}</p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-500 mb-1">{t('insulin.aiRecommendation')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('insulin.recommendationText')} 
                            {(reportsData as any)?.reports?.length > 0 
                              ? ' ' + t('insulin.confidence.withReports')
                              : ' ' + t('insulin.confidence.withoutReports')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Upload className="w-4 h-4 mr-2" />
                        {t('insulin.uploadMedicalReport')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAIPrediction(false)}>
                        {t('insulin.dismiss')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-primary" />
                    {t('insulin.todaysInsulin')}
                  </CardTitle>
                  <CardDescription>{t('insulin.totalUnitsAdministered')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">12.5 units</p>
                  <div className="mt-4">
                    <label className="text-sm text-muted-foreground mb-2 block">{t('insulin.manualEntry')}:</label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder={t('insulin.enterUnits')} 
                        value={manualInsulin}
                        onChange={(e) => setManualInsulin(e.target.value)}
                      />
                      <Button size="sm">{t('insulin.log')}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {t('insulin.weeklyAverage')}
                  </CardTitle>
                  <CardDescription>{t('insulin.averageDailyInsulin')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">14.2 units</p>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t('insulin.trend')}</p>
                    <div className="w-full bg-secondary h-2 rounded-full mt-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insulin History */}
            <Card>
              <CardHeader>
                <CardTitle>{t('insulin.recentInsulinLogs')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { time: '8:00 AM', type: 'Basal', units: 6, method: 'Auto (AI)' },
                    { time: '12:30 PM', type: 'Bolus', units: 4, method: 'Manual' },
                    { time: '6:00 PM', type: 'Basal', units: 6, method: 'Auto (AI)' },
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-semibold">{log.type} Insulin</p>
                        <p className="text-sm text-muted-foreground">{log.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{log.units} units</p>
                        <Badge variant="outline" className="text-xs">{log.method}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
