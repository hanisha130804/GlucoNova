import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { 
  Activity,
  Clock,
  Flame,
  Cake,
  Lightbulb,
  CheckCircle,
  Smartphone,
  Sunrise,
  UtensilsCrossed,
  Timer,
  Target,
  BarChart3
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function GlucoseInsulinPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // 3-Step Flow State
  const [step, setStep] = useState(1); // 1: Glucose, 2: Context, 3: Insights
  const [glucose, setGlucose] = useState('');
  const [context, setContext] = useState('fasting');
  const [insulinTaken, setInsulinTaken] = useState(false);
  const [insulinDose, setInsulinDose] = useState('');
  const [carbsEaten, setCarbsEaten] = useState(false);
  const [carbsAmount, setCarbsAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['/api/health-data'],
  }) as { data?: any[], isLoading: boolean };

  const createHealthDataMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/health-data', { method: 'POST', body: JSON.stringify(data) });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Reading Saved!',
        description: 'Your glucose reading has been recorded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      // Reset to step 1 with fresh form
      setStep(1);
      setGlucose('');
      setContext('fasting');
      setInsulinTaken(false);
      setInsulinDose('');
      setCarbsEaten(false);
      setCarbsAmount('');
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to Save',
        description: error.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveReading = () => {
    const glucoseValue = parseFloat(glucose);
    if (!glucose || isNaN(glucoseValue) || glucoseValue < 40 || glucoseValue > 400) {
      toast({
        title: 'Invalid Reading',
        description: 'Please enter a glucose value between 40 and 400 mg/dL.',
        variant: 'destructive',
      });
      return;
    }

    // Build payload matching backend schema - DO NOT include timestamp (backend auto-generates)
    const payload: any = {
      glucose: glucoseValue,
    };

    // Add insulin if toggle enabled
    if (insulinTaken && insulinDose) {
      payload.insulin = {
        taken: true,
        type: 'rapid-acting',
        dose: parseFloat(insulinDose),
      };
    }

    // Add carbs if toggle enabled
    if (carbsEaten && carbsAmount) {
      payload.carbs = {
        consumed: true,
        meal: context === 'fasting' ? t('food.breakfast') : context === 'beforeMeal' ? t('food.beforeMeal') : context === 'afterMeal' ? t('food.afterMeal') : t('food.snack'),
        grams: parseFloat(carbsAmount),
        notes: notes || undefined,
      };
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      payload.notes = `${context} - ${notes}`;
    }

    console.log('💾 Saving glucose reading:', payload);
    createHealthDataMutation.mutate(payload);
  };

  // Get insights based on glucose value
  const getInsights = () => {
    const glucoseValue = parseInt(glucose);
    if (!glucoseValue) return null;
    
    if (glucoseValue < 70) return {
      type: 'low',
      title: 'Glucose is Low',
      message: 'Consider consuming 15g fast-acting carbs (juice, glucose tablets)',
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      icon: '🔽'
    };
    if (glucoseValue > 180) return {
      type: 'high',
      title: 'Glucose is High',
      message: 'Consider light activity, hydration, or consult your healthcare provider',
      color: 'text-amber-400',
      bg: 'bg-amber-900/20',
      icon: '🔼'
    };
    return {
      type: 'normal',
      title: 'Glucose in Range',
      message: 'Great! Keep up the good management',
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20',
      icon: '✅'
    };
  };

  // Format recent readings for display - ONLY show real user data, NO placeholders
  const recentReadings = Array.isArray(healthData) && healthData.length > 0
    ? healthData.slice(0, 3).map((entry: any) => ({
        time: new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        glucose: entry.glucose,
        context: entry.notes || 'No context',
      }))
    : []; // Empty array when no real data

  return (
    <div className="flex h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', backgroundColor: '#142033' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">{t('glucoseInsulin.logGlucoseReading')}</h2>
              <p className="text-sm text-muted-foreground">{t('glucoseInsulin.quickLogging')}</p>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto" style={{ padding: '24px 32px' }}>

            {/* Progress Steps */}
            <div className="flex justify-between items-center mb-8 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -translate-y-1/2 -z-10"></div>
              {[
                { num: 1, icon: Smartphone, label: t('glucoseInsulin.enterReading') },
                { num: 2, icon: Clock, label: t('glucoseInsulin.addContext') },
                { num: 3, icon: Lightbulb, label: t('glucoseInsulin.getInsights') }
              ].map(({ num, icon: StepIcon, label }) => (
                <div key={num} className="flex flex-col items-center relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    step >= num ? 'border-emerald-500 bg-emerald-900/20 text-emerald-400' : 'border-gray-700 text-gray-500'
                  }`}>
                    <StepIcon className={`w-5 h-5 transition-all ${
                      step >= num ? 'animate-pulse' : ''
                    }`} />
                  </div>
                  <span className="text-xs mt-2 text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: ENTER GLUCOSE */}
            {step === 1 && (
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-300">{t('glucoseInsulin.glucoseReadingPrompt')}</h2>
                    <p className="text-gray-500">{t('glucoseInsulin.enterCurrentGlucose')}</p>
                  </div>
                </div>

                {/* Large Glucose Input */}
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <input
                      type="number"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="text-6xl font-bold text-center bg-transparent border-0 outline-none text-gray-300 w-48"
                      placeholder="--"
                      autoFocus
                    />
                    <div className="text-xl text-gray-500 mt-2">mg/dL</div>
                  </div>
                  
                  {/* Quick Status Indicators */}
                  <div className="flex justify-center gap-4 mt-6">
                    {[
                      { label: 'Low', range: '<70', color: 'bg-blue-900/30 text-blue-400' },
                      { label: 'Normal', range: '70-180', color: 'bg-emerald-900/30 text-emerald-400' },
                      { label: 'High', range: '>180', color: 'bg-amber-900/30 text-amber-400' }
                    ].map((item) => (
                      <div key={item.label} className={`px-4 py-2 rounded-lg ${item.color}`}>
                        <div className="text-sm">{item.label}</div>
                        <div className="text-xs opacity-80">{item.range}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => glucose && setStep(2)}
                  disabled={!glucose}
                  className={`w-full py-4 rounded-xl font-medium transition-all ${
                    glucose ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {t('glucoseInsulin.continueToContext')}
                </button>
              </div>
            )}

            {/* STEP 2: ADD CONTEXT */}
            {step === 2 && (
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-300">{t('glucoseInsulin.whenReadingTaken')}</h2>
                    <p className="text-gray-500">{t('glucoseInsulin.contextHelpsPatterns')}</p>
                  </div>
                </div>

                {/* Context Options */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { id: 'fasting', label: t('glucoseInsulin.fasting'), icon: Sunrise, desc: t('glucoseInsulin.beforeBreakfast') },
                    { id: 'beforeMeal', label: t('glucoseInsulin.beforeMeal'), icon: UtensilsCrossed, desc: t('glucoseInsulin.beforeEating') },
                    { id: 'afterMeal', label: t('glucoseInsulin.afterMeal'), icon: Timer, desc: t('glucoseInsulin.afterEating') },
                    { id: 'random', label: t('glucoseInsulin.random'), icon: Target, desc: t('glucoseInsulin.anyOtherTime') }
                  ].map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setContext(option.id)}
                        className={`p-4 rounded-xl border transition-all group ${
                          context === option.id ? 'border-cyan-500/50 bg-cyan-900/20' : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="mb-2 flex justify-center">
                          <IconComponent className={`w-8 h-8 transition-all ${
                            context === option.id 
                              ? 'text-cyan-400 animate-pulse' 
                              : 'text-gray-400 group-hover:text-cyan-400 group-hover:scale-110'
                          }`} />
                        </div>
                        <div className="font-medium text-gray-300">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Additional Info */}
                <div className="space-y-4 mb-6">
                  {/* Insulin Section */}
                  <div className="p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-gray-300">{t('glucoseInsulin.didTakeInsulin')}</span>
                      </div>
                      <button
                        onClick={() => setInsulinTaken(!insulinTaken)}
                        className={`w-12 h-6 rounded-full transition-all ${insulinTaken ? 'bg-purple-600' : 'bg-gray-700'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                          insulinTaken ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {insulinTaken && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          value={insulinDose}
                          onChange={(e) => setInsulinDose(e.target.value)}
                          placeholder={t('glucoseInsulin.doseInUnits')}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300"
                        />
                        <span className="text-gray-400">units</span>
                      </div>
                    )}
                  </div>

                  {/* Carbs Section */}
                  <div className="p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Cake className="w-5 h-5 text-amber-400" />
                        <span className="font-medium text-gray-300">{t('glucoseInsulin.didEatFood')}</span>
                      </div>
                      <button
                        onClick={() => setCarbsEaten(!carbsEaten)}
                        className={`w-12 h-6 rounded-full transition-all ${carbsEaten ? 'bg-amber-600' : 'bg-gray-700'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                          carbsEaten ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {carbsEaten && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          value={carbsAmount}
                          onChange={(e) => setCarbsAmount(e.target.value)}
                          placeholder={t('glucoseInsulin.carbsInGrams')}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300"
                        />
                        <span className="text-gray-400">grams</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t('glucoseInsulin.additionalNotes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('glucoseInsulin.exerciseStressMedication')}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 h-24 text-gray-300"
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-gray-300"
                  >
                    {t('glucoseInsulin.back')}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition text-white"
                  >
                    {t('glucoseInsulin.seeInsights')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: GET INSIGHTS */}
            {step === 3 && (
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/10 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-300">{t('glucoseInsulin.yourGlucoseInsights')}</h2>
                    <p className="text-gray-500">{t('glucoseInsulin.personalizedRecommendations')}</p>
                  </div>
                </div>

                {/* Main Glucose Display */}
                <div className="text-center mb-8">
                  <div className="text-6xl font-bold text-gray-300 mb-2">{glucose}</div>
                  <div className="text-xl text-gray-500">mg/dL</div>
                  
                  {/* Status Badge */}
                  {getInsights() && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${getInsights()?.bg}`}>
                      <span className="text-2xl">{getInsights()?.icon}</span>
                      <span className={`font-medium ${getInsights()?.color}`}>
                        {getInsights()?.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-300">{t('glucoseInsulin.recommendedAction')}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {getInsights()?.message || 'Continue monitoring regularly'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Insulin Recorded */}
                  {insulinTaken && (
                    <div className="p-4 rounded-xl bg-cyan-900/20 border border-cyan-800/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-300">{t('glucoseInsulin.insulinRecorded')}</h4>
                          <p className="text-sm text-gray-400">{insulinDose} {t('glucoseInsulin.unitsTaken')}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-cyan-400">{insulinDose}</div>
                          <div className="text-xs text-gray-500">units</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Carbs Recorded */}
                  {carbsEaten && (
                    <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-800/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-300">{t('glucoseInsulin.carbsRecorded')}</h4>
                          <p className="text-sm text-gray-400">{carbsAmount}{t('glucoseInsulin.gramsCarbs')}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-400">{carbsAmount}</div>
                          <div className="text-xs text-gray-500">grams</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700">
                    <h4 className="font-medium text-gray-300 mb-3">{t('glucoseInsulin.nextSteps')}</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        {t('glucoseInsulin.monitorInHours')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        {t('glucoseInsulin.logNextMeal')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {t('glucoseInsulin.checkPatterns')}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Save & Navigation */}
                <div className="space-y-3">
                  <button 
                    onClick={handleSaveReading}
                    disabled={createHealthDataMutation.isPending}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl font-medium transition text-white disabled:opacity-50"
                  >
                    {createHealthDataMutation.isPending ? t('common.loading') : t('glucoseInsulin.saveAndContinue')}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-gray-300"
                    >
                      {t('glucoseInsulin.editContext')}
                    </button>
                    <button
                      onClick={() => {
                        setStep(1);
                        setGlucose('');
                        setContext('fasting');
                        setInsulinTaken(false);
                        setInsulinDose('');
                        setCarbsEaten(false);
                        setCarbsAmount('');
                        setNotes('');
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition text-white"
                    >
                      {t('glucoseInsulin.logAnother')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Logs Preview */}
            <div className="mt-8 glass-card rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">{t('glucoseInsulin.recentReadings')}</h3>
              {recentReadings.length > 0 ? (
                <div className="space-y-3">
                  {recentReadings.map((reading, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          reading.glucose < 70 ? 'bg-blue-900/30 group-hover:bg-blue-900/40' : 
                          reading.glucose > 180 ? 'bg-amber-900/30 group-hover:bg-amber-900/40' : 
                          'bg-emerald-900/30 group-hover:bg-emerald-900/40'
                        }`}>
                          <BarChart3 className={`w-5 h-5 ${
                            reading.glucose < 70 ? 'text-blue-400' : 
                            reading.glucose > 180 ? 'text-amber-400' : 
                            'text-emerald-400'
                          } group-hover:scale-110 transition-transform`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-300">{reading.glucose} mg/dL</div>
                          <div className="text-sm text-gray-500">{reading.time} • {reading.context}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        reading.glucose < 70 ? 'bg-blue-900/30 text-blue-400' : 
                        reading.glucose > 180 ? 'bg-amber-900/30 text-amber-400' : 
                        'bg-emerald-900/30 text-emerald-400'
                      }`}>
                        {reading.glucose < 70 ? 'Low' : reading.glucose > 180 ? 'High' : 'Normal'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600 animate-pulse" />
                  <p className="text-gray-400 font-medium">{t('glucoseInsulin.noReadings')}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('glucoseInsulin.readingsWillAppear')}</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
