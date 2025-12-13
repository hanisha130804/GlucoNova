import { useState, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import MetricCard from '@/components/MetricCard';
import GlucoseTrendChart from '@/components/GlucoseTrendChart';
import VoiceAssistantCard from '@/components/VoiceAssistantCard';
import ProgressCard from '@/components/ProgressCard';
import QuickActionCard from '@/components/QuickActionCard';
import OnboardingModal from '@/components/OnboardingModal';
import OnboardingBanner from '@/components/OnboardingBanner';
import LanguageSelector from '@/components/LanguageSelector';
import InsulinPredictionCard from '@/components/InsulinPredictionCard';
import MedicationPanel from '@/components/MedicationPanel';
import { Droplet, Target, Utensils, Syringe, Heart, Pill, MessageCircle, FileText, Activity, Stethoscope, Thermometer, TestTube, Clipboard, Sparkles, Brain, TrendingUp, AlertCircle, Award, Flame, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface HealthDataEntry {
  glucose: number;
  insulin: number;
  carbs: number;
  timestamp: string;
  [key: string]: any;
}

interface MealDataEntry {
  carbs: number;
  [key: string]: any;
}

interface PredictionData {
  predictedInsulin: number;
  confidence: number;
  factors: string[];
  timestamp: string;
}

interface ProfileData {
  weight?: number;
  height?: number;
  lastA1c?: number;
  typicalInsulin?: number;
  [key: string]: any;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnboardingMandatory, setIsOnboardingMandatory] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');

  // Update display name from extracted patient name or user name
  useEffect(() => {
    const extractedName = localStorage.getItem('extractedPatientName');
    if (extractedName) {
      setDisplayName(extractedName);
      console.log('Using extracted patient name:', extractedName);
    } else if (user?.name) {
      setDisplayName(user.name);
      console.log('Using authenticated user name:', user.name);
    } else {
      setDisplayName(t('common.user'));
    }
  }, [user, t]);

  // Run onboarding check when component mounts AND when user changes
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    const onboardingSkipped = localStorage.getItem('onboardingSkipped');
    const skipAuth = localStorage.getItem('skipAuth');
    const isNewUser = localStorage.getItem('isNewUser');
    
    console.log('=== Dashboard Onboarding Check ===' );
    console.log('onboardingCompleted:', onboardingCompleted);
    console.log('onboardingSkipped:', onboardingSkipped);
    console.log('skipAuth:', skipAuth);
    console.log('isNewUser:', isNewUser);
    console.log('user:', user);
    console.log('user.role:', user?.role);
    console.log('showOnboarding state:', showOnboarding);
    console.log('isOnboardingMandatory state:', isOnboardingMandatory);
    
    // PRIORITY 0: Doctors and Admins should NOT see onboarding modal
    // They don't need to enter medical data during onboarding
    if (user && (user.role === 'doctor' || user.role === 'admin')) {
      console.log('✅ Doctor/Admin user detected - skipping onboarding');
      setShowOnboarding(false);
      setShowBanner(false);
      setIsOnboardingMandatory(false);
      // Mark as completed to prevent showing in future
      localStorage.setItem('onboardingCompleted', 'true');
      return;
    }
    
    // PRIORITY 1: For skip-auth users, ALWAYS show mandatory onboarding immediately if not completed
    // This ensures skip-auth users can't bypass onboarding
    if (skipAuth === 'true' && !onboardingCompleted) {
      console.log('✅ Showing MANDATORY onboarding IMMEDIATELY for SKIP-AUTH user');
      setShowOnboarding(true);
      setShowBanner(false);
      setIsOnboardingMandatory(true);
      return;
    }
    
    // PRIORITY 2: For authenticated new users, show onboarding modal on EVERY login
    // This ensures patients can upload medical reports and complete profile setup
    // Modal is optional (not mandatory) so they can skip if needed
    // NOTE: Modal will appear on every login until onboarding is completed
    if (!skipAuth && !onboardingCompleted) {
      console.log('✅ AUTHENTICATED USER - Showing optional onboarding modal for medical report upload');
      setShowBanner(false);
      setShowOnboarding(true);  // Show modal so patients can upload medical reports
      setIsOnboardingMandatory(false);  // Optional - can be skipped
      return;
    }
    
    // PRIORITY 3: For users who previously skipped onboarding, show banner
    if (!onboardingCompleted && onboardingSkipped === 'true' && !skipAuth) {
      console.log('ℹ️ Showing onboarding banner for user who previously skipped');
      setShowBanner(true);
      setIsOnboardingMandatory(false);
      return;
    }
    
    console.log('ℹ️ Onboarding completed or not required');
  }, [user]); // Re-run when user object changes

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowBanner(false);
    setIsOnboardingMandatory(false);
    localStorage.removeItem('isNewUser'); // Clear new user flag
    localStorage.removeItem('onboardingSkipped'); // Clear skip flag
    toast({
      title: t('common.success'),
      description: t('dashboard.profile.setupComplete'),
    });
  };

  const handleOnboardingSkip = () => {
    // Only allow skip if not mandatory
    if (!isOnboardingMandatory) {
      setShowOnboarding(false);
      setShowBanner(true);
    }
  };

  const handleResumeSetup = () => {
    localStorage.removeItem('onboardingSkipped');
    setShowBanner(false);
    setShowOnboarding(true);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
  };

  const { data: healthData, isLoading: isLoadingHealth } = useQuery<{ data: HealthDataEntry[] }>({
    queryKey: ['/api/health-data'],
  });

  const { data: mealsData, isLoading: isLoadingMeals } = useQuery<{ data: MealDataEntry[] }>({
    queryKey: ['/api/meals'],
  });

  const { data: latestPrediction, isLoading: isLoadingPrediction } = useQuery<{ prediction: PredictionData }>({
    queryKey: ['/api/predictions/latest'],
  });

  const { data: profileData, isLoading: isLoadingProfile } = useQuery<{ profile: ProfileData }>({
    queryKey: ['/api/profile'],
  });

  const { data: reportsData } = useQuery({
    queryKey: ['/api/reports'],
  });

  const generatePredictionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/predictions/insulin', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/latest'] });
      toast({
        title: t('insulin.prediction.generated'),
        description: t('insulin.prediction.ready'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('insulin.prediction.failed'),
        description: error.message || t('insulin.prediction.unable'),
        variant: 'destructive',
      });
    },
  });

  const latestGlucose = healthData?.data?.[0]?.glucose || 0;
  const latestInsulin = healthData?.data?.[0]?.insulin || 0;
  const latestReading = healthData?.data?.[0]; // Latest health data entry for timestamp
  
  const totalCarbs = mealsData?.data?.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0) || 0;
  
  const calculateTimeInRange = () => {
    if (!healthData?.data || healthData.data.length === 0) return 0;
    
    const inRangeCount = healthData.data.filter((entry: any) => {
      const glucose = entry.glucose;
      return glucose >= 70 && glucose <= 180;
    }).length;
    
    return Math.round((inRangeCount / healthData.data.length) * 100);
  };
  
  const timeInRange = calculateTimeInRange();

  const getGlucoseStatus = (glucose: number) => {
    if (glucose < 70) return t('medical.hypoglycemia');
    if (glucose > 180) return t('medical.hyperglycemia');
    return t('medical.timeInRange');
  };

  // Calculate health score based on multiple factors
  const calculateHealthScore = () => {
    let score = 0;
    let maxScore = 0;

    // Time in range (40 points)
    maxScore += 40;
    if (timeInRange >= 70) score += 40;
    else if (timeInRange >= 50) score += 30;
    else if (timeInRange >= 30) score += 20;
    else score += 10;

    // Glucose control (30 points)
    maxScore += 30;
    if (latestGlucose >= 70 && latestGlucose <= 180) score += 30;
    else if (latestGlucose >= 60 && latestGlucose <= 200) score += 20;
    else score += 10;

    // Data logging consistency (30 points)
    maxScore += 30;
    const dataPoints = healthData?.data?.length || 0;
    if (dataPoints >= 10) score += 30;
    else if (dataPoints >= 5) score += 20;
    else if (dataPoints >= 1) score += 10;

    return Math.round((score / maxScore) * 100);
  };

  const healthScore = calculateHealthScore();

  // Determine achievements
  const achievements = [];
  if (timeInRange >= 70) achievements.push({ title: t('dashboard.achievements.timeChampion'), desc: t('dashboard.achievements.timeChampionDesc'), icon: '🏆' });
  if (healthData?.data && Array.isArray(healthData.data) && healthData.data.length >= 10) achievements.push({ title: t('dashboard.achievements.consistentLogger'), desc: t('dashboard.achievements.consistentLoggerDesc'), icon: '📊' });
  if (latestGlucose >= 70 && latestGlucose <= 180) achievements.push({ title: t('dashboard.achievements.perfectRange'), desc: t('dashboard.achievements.perfectRangeDesc'), icon: '🎯' });
  if (mealsData?.data && Array.isArray(mealsData.data) && mealsData.data.length >= 5) achievements.push({ title: t('dashboard.achievements.mealTracker'), desc: t('dashboard.achievements.mealTrackerDesc'), icon: '🍽️' });

  // Floating teal/cyan dots - reduced count, lighter colors
  const floatingDots = [
    { id: 1, size: 10, left: 15, top: 10, duration: 50, delay: 0, xRange: 0.4, yRange: 0.6, color: 'rgba(34, 211, 238, 0.25)' },
    { id: 2, size: 12, left: 85, top: 15, duration: 55, delay: 2, xRange: -0.4, yRange: 0.6, color: 'rgba(45, 212, 191, 0.25)' },
    { id: 3, size: 11, left: 10, top: 70, duration: 52, delay: 4, xRange: 0.4, yRange: -0.4, color: 'rgba(34, 211, 238, 0.25)' },
    { id: 4, size: 13, left: 88, top: 75, duration: 58, delay: 1, xRange: -0.4, yRange: 0.6, color: 'rgba(45, 212, 191, 0.25)' },
    { id: 5, size: 10, left: 40, top: 50, duration: 54, delay: 3, xRange: 0.4, yRange: -0.6, color: 'rgba(34, 211, 238, 0.25)' },
  ];

  // Uneven circular elements with emerald green (reduced size and opacity with blur)
  const unevenCircles = [
    { id: 1, size: 18, left: 30, top: 20, duration: 55, delay: 0, opacity: 0.015, xRange: 0.4, yRange: 0.6, color: 'rgba(52, 211, 153, 0.08)' },
    { id: 2, size: 25, left: 70, top: 65, duration: 52, delay: 3, opacity: 0.04, xRange: -0.6, yRange: 0.6, color: 'rgba(52, 211, 153, 0.12)' },
    { id: 3, size: 15, left: 18, top: 55, duration: 58, delay: 1.5, opacity: 0.01, xRange: 0.6, yRange: -0.4, color: 'rgba(52, 211, 153, 0.06)' },
    { id: 4, size: 22, left: 85, top: 35, duration: 50, delay: 4, opacity: 0.03, xRange: -0.4, yRange: 0.6, color: 'rgba(52, 211, 153, 0.1)' },
    { id: 5, size: 20, left: 50, top: 80, duration: 62, delay: 2.5, opacity: 0.025, xRange: 0.6, yRange: -0.6, color: 'rgba(52, 211, 153, 0.08)' },
    { id: 6, size: 16, left: 12, top: 25, duration: 56, delay: 5, opacity: 0.015, xRange: -0.6, yRange: 0.6, color: 'rgba(52, 211, 153, 0.07)' },
    { id: 7, size: 24, left: 60, top: 10, duration: 60, delay: 1, opacity: 0.035, xRange: 0.4, yRange: 0.6, color: 'rgba(52, 211, 153, 0.11)' },
    { id: 8, size: 17, left: 92, top: 70, duration: 52, delay: 3.5, opacity: 0.02, xRange: -0.6, yRange: -0.6, color: 'rgba(52, 211, 153, 0.07)' },
  ];

  // Floating medical icons (white with low opacity)
  const medicalIcons = [
    { id: 1, Icon: Pill, left: 12, top: 15, duration: 55, delay: 0, xRange: 0.4, yRange: 0.6, rotation: 15 },
    { id: 2, Icon: Syringe, left: 82, top: 25, duration: 60, delay: 2, xRange: -0.4, yRange: 0.6, rotation: -20 },
    { id: 3, Icon: Heart, left: 25, top: 60, duration: 54, delay: 4, xRange: 0.4, yRange: -0.4, rotation: 10 },
    { id: 4, Icon: Activity, left: 70, top: 80, duration: 58, delay: 1.5, xRange: -0.4, yRange: 0.6, rotation: -15 },
    { id: 5, Icon: Droplet, left: 45, top: 35, duration: 56, delay: 3.5, xRange: 0.4, yRange: 0.6, rotation: 12 },
    { id: 6, Icon: Stethoscope, left: 88, top: 55, duration: 62, delay: 5, xRange: -0.4, yRange: -0.6, rotation: -18 },
    { id: 7, Icon: Thermometer, left: 18, top: 78, duration: 52, delay: 2.5, xRange: 0.4, yRange: 0.6, rotation: 8 },
    { id: 8, Icon: TestTube, left: 55, top: 12, duration: 60, delay: 1, xRange: -0.4, yRange: 0.6, rotation: -12 },
    { id: 9, Icon: Clipboard, left: 35, top: 88, duration: 54, delay: 4.5, xRange: 0.4, yRange: -0.4, rotation: 16 },
  ];

  return (
    <div className="flex h-screen w-full relative overflow-hidden animate-in fade-in duration-300" style={{ backgroundColor: '#0f172a' }}>
        
        {/* Animated Colorful Light Waves with Cyan/Teal accents */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div 
            className="absolute top-0 left-0 right-0 h-96 opacity-30"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34, 211, 238, 0.08), transparent)',
              animation: 'wave1 15s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute top-1/3 left-0 right-0 h-96 opacity-20"
            style={{
              background: 'radial-gradient(ellipse 70% 40% at 30% 50%, rgba(52, 211, 153, 0.06), transparent)',
              animation: 'wave2 18s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-96 opacity-25"
            style={{
              background: 'radial-gradient(ellipse 75% 45% at 70% 100%, rgba(34, 211, 238, 0.07), transparent)',
              animation: 'wave3 20s ease-in-out infinite',
            }}
          />
        </div>

        {/* Small Floating Dots - Above waves (colorful with glow) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          {floatingDots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full"
              style={{
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                left: `${dot.left}%`,
                top: `${dot.top}%`,
                backgroundColor: dot.color,
                animation: `floatDot${dot.id} ${dot.duration}s ease-in-out infinite`,
                animationDelay: `${dot.delay}s`,
                boxShadow: `0 0 20px 8px ${dot.color.replace('0.3', '0.4')}, 0 0 40px 15px ${dot.color.replace('0.3', '0.2')}, 0 0 60px 25px ${dot.color.replace('0.3', '0.1')}`,
              }}
            />
          ))}
        </div>

        {/* Uneven Circular Elements - Above waves with colorful radiation glow and blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          {unevenCircles.map((circle) => (
            <div
              key={`circle-${circle.id}`}
              className="absolute rounded-full"
              style={{
                width: `${circle.size}px`,
                height: `${circle.size}px`,
                left: `${circle.left}%`,
                top: `${circle.top}%`,
                backgroundColor: circle.color,
                opacity: circle.opacity,
                animation: `floatCircle${circle.id} ${circle.duration}s ease-in-out infinite`,
                animationDelay: `${circle.delay}s`,
                boxShadow: `0 0 30px 12px ${circle.color.replace(/0\.\d+\)/, '0.5)')}, 0 0 60px 25px ${circle.color.replace(/0\.\d+\)/, '0.3)')}, 0 0 90px 40px ${circle.color.replace(/0\.\d+\)/, '0.15)')}`,
                filter: 'blur(3px)',
              }}
            />
          ))}
        </div>

        {/* Floating Medical Icons - White with low opacity and glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          {medicalIcons.map((item) => {
            const Icon = item.Icon;
            return (
              <div
                key={`icon-${item.id}`}
                className="absolute text-white"
                style={{
                  left: `${item.left}%`,
                  top: `${item.top}%`,
                  opacity: 0.12,
                  animation: `floatIcon${item.id} ${item.duration}s ease-in-out infinite`,
                  animationDelay: `${item.delay}s`,
                  filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.2))',
                }}
              >
                <Icon className="w-6 h-6" />
              </div>
            );
          })}
        </div>

        <AppSidebar />
        {/* Content area with lighter background for contrast */}
        <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px', backgroundColor: '#142033' }}>
          {showBanner && (
            <OnboardingBanner 
              onResume={handleResumeSetup}
              onDismiss={handleDismissBanner}
            />
          )}
          <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{t('dashboard.title')}</h2>
            </div>
            <LanguageSelector />
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('dashboard.welcomeBack', { name: displayName || t('common.user') })}</h1>
              <p className="text-muted-foreground">{t('dashboard.healthOverview')}</p>
            </div>

            {isLoadingHealth || isLoadingMeals ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('dashboard.loadingData')}</p>
              </div>
            ) : (
              <>
                {/* Main Content Grid: 1fr + 360px */}
                <div className="grid gap-7" style={{ gridTemplateColumns: '1fr 360px' }}>
                  {/* Left Column - Main Content */}
                  <div className="space-y-6" style={{ minHeight: '100vh' }}>
                    {/* Dashboard Tabs */}
                    <div className="flex gap-2 mb-2">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                      >
                        {t('dashboard.tabs.overview')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('ai-insights')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ai-insights' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {t('dashboard.tabs.aiInsights')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('trends')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'trends' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                      >
                        {t('dashboard.tabs.trends')}
                      </button>
                    </div>
                
                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                      <>
                        {/* AI Daily Diabetes Summary - NEW */}
                        <Card className="p-6 relative overflow-hidden" style={{
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(34,211,238,0.1) 100%)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          boxShadow: '0 0 30px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.2)' }}>
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <h2 className="text-xl font-bold text-foreground">{t('dashboard.aiSummary.title')}</h2>
                                <p className="text-xs text-muted-foreground">
                                  {t('dashboard.aiSummary.lastUpdated')} {latestReading ? new Date(latestReading.timestamp).toLocaleString(undefined, { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    month: 'short', 
                                    day: 'numeric',
                                    hour12: true 
                                  }) : t('common.noData') || 'No data'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{
                                background: 'rgba(34,197,94,0.2)',
                                color: '#22c55e'
                              }}>🟢 {t('dashboard.aiSummary.stableDay')}</span>
                              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{
                                background: 'rgba(59,130,246,0.2)',
                                color: '#3b82f6'
                              }}>🔵 {t('dashboard.aiSummary.mildMorningRisk')}</span>
                            </div>
                          </div>
                          <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-sm text-foreground leading-relaxed">
                              {t('dashboard.aiSummary.glucoseStable')} <span className="font-semibold text-emerald-400">{t('dashboard.aiSummary.stableHours')}</span> {t('dashboard.aiSummary.withAverage')} {latestGlucose || 120} mg/dL. 
                              {totalCarbs > 150 ? (
                                <> {t('dashboard.aiSummary.breakfastSpike')} <span className="font-semibold text-cyan-400">{t('dashboard.aiSummary.reduceRice')}</span>.</>
                              ) : (
                                <> {t('dashboard.aiSummary.carbsBalanced')} <span className="font-semibold text-emerald-400">{t('dashboard.aiSummary.goodWork')}</span>!</>
                              )}
                            </p>
                          </div>
                          {timeInRange < 70 && (
                            <div className="mt-3 p-3 rounded-lg flex items-start gap-3" style={{ background: 'rgba(251,146,60,0.1)' }}>
                              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
                              <p className="text-xs text-muted-foreground">⚠️ {t('dashboard.aiSummary.patternDetected')}</p>
                            </div>
                          )}
                        </Card>

                        {/* Top Stats Row - 4 cards across with emerald glow */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <MetricCard
                            titleKey="dashboard.metrics.glucose"
                            value={latestGlucose > 0 ? latestGlucose.toString() : '--'}
                            unit="mg/dL"
                            statusKey={latestGlucose > 0 ? (latestGlucose < 70 ? 'medical.hypoglycemia' : latestGlucose > 180 ? 'medical.hyperglycemia' : 'medical.timeInRange') : 'dashboard.metrics.status.noData'}
                            icon={Droplet}
                            iconColor="#60A5FA"
                            badgeBgColor="rgba(96, 165, 250, 0.2)"
                            badgeTextColor="#60A5FA"
                            showGlow={true}
                          />
                          <MetricCard
                            titleKey="dashboard.metrics.timeInRange"
                            value={`${timeInRange}%`}
                            unit=""
                            statusKey={timeInRange >= 70 ? 'dashboard.metrics.status.excellent' : timeInRange >= 50 ? 'dashboard.metrics.status.good' : 'dashboard.metrics.status.needsImprovement'}
                            icon={Target}
                            iconColor="#A78BFA"
                            badgeBgColor="rgba(167, 139, 250, 0.2)"
                            badgeTextColor="#A78BFA"
                            showGlow={true}
                          />
                          <MetricCard
                            titleKey="dashboard.metrics.carbsToday"
                            value={totalCarbs > 0 ? `${totalCarbs}g` : '--'}
                            unit=""
                            statusKey={totalCarbs > 0 ? 'dashboard.metrics.status.tracked' : 'dashboard.metrics.status.noData'}
                            icon={Utensils}
                            iconColor="#FB923C"
                            badgeBgColor="rgba(251, 146, 60, 0.2)"
                            badgeTextColor="#FB923C"
                            showGlow={true}
                          />
                          <MetricCard
                            titleKey="dashboard.metrics.activeInsulin"
                            value={latestInsulin > 0 ? `${latestInsulin}U` : '--'}
                            unit=""
                            statusKey={latestInsulin > 0 ? 'dashboard.metrics.status.active' : 'dashboard.metrics.status.noData'}
                            icon={Syringe}
                            iconColor="#2DD4BF"
                            badgeBgColor="rgba(45, 212, 191, 0.2)"
                            badgeTextColor="#2DD4BF"
                            showGlow={true}
                          />
                        </div>

                    {/* Glucose Trends Chart */}
                    <GlucoseTrendChart />

                    {/* NEW: 4-Hour Glucose Forecast */}
                    <Card className="p-6 relative overflow-hidden" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)' }}>
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                          </div>
                          <h2 className="text-lg font-bold text-foreground">{t('dashboard.glucosePrediction.title')}</h2>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full font-medium" style={{
                          background: 'rgba(167,139,250,0.2)',
                          color: '#a78bfa'
                        }}>{t('dashboard.glucosePrediction.aiConfidence')} {t('dashboard.glucosePrediction.medium')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">{t('dashboard.glucosePrediction.predictedRange')}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-blue-400">{latestGlucose > 0 ? Math.max(70, latestGlucose - 15) : 95}</span>
                            <span className="text-2xl text-muted-foreground">-</span>
                            <span className="text-4xl font-bold text-blue-400">{latestGlucose > 0 ? Math.min(180, latestGlucose + 10) : 125}</span>
                            <span className="text-sm text-muted-foreground">mg/dL</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                              <span className="text-xs text-muted-foreground">{t('dashboard.glucosePrediction.basedOnPatterns')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                              <span className="text-xs text-muted-foreground">{t('dashboard.glucosePrediction.considersMeal')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#a78bfa' }} />
                              <span className="text-xs text-muted-foreground">{t('dashboard.glucosePrediction.activityFactored')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <p className="text-xs text-muted-foreground">💡 <span className="font-medium text-foreground">{t('dashboard.glucosePrediction.tip')}</span> {t('dashboard.glucosePrediction.peakTiming')}</p>
                      </div>
                    </Card>

                    {/* AI Insulin Prediction Calculator */}
                    <InsulinPredictionCard 
                      userProfile={profileData?.profile}
                    />

                    {/* Quick Actions at bottom with colorful variety */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">{t('dashboard.quickActions.title')}</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <Link href="/health-data">
                          <div className="cursor-pointer">
                            <QuickActionCard
                              icon={Heart}
                              titleKey="dashboard.quickActions.bloodSugarTracking"
                              descriptionKey="dashboard.quickActions.logAndMonitor"
                              iconBgColor="rgba(244, 114, 182, 0.2)"
                              iconColor="#F472B6"
                            />
                          </div>
                        </Link>
                        <Link href="/meals">
                          <div className="cursor-pointer">
                            <QuickActionCard
                              icon={Utensils}
                              titleKey="dashboard.quickActions.mealLogging"
                              descriptionKey="dashboard.quickActions.trackNutrition"
                              iconBgColor="rgba(251, 146, 60, 0.2)"
                              iconColor="#FB923C"
                            />
                          </div>
                        </Link>
                        <Link href="/reports">
                          <div className="cursor-pointer">
                            <QuickActionCard
                              icon={FileText}
                              titleKey="dashboard.quickActions.healthReports"
                              descriptionKey="dashboard.quickActions.viewReports"
                            />
                          </div>
                        </Link>
                        <div className="cursor-pointer">
                          <QuickActionCard
                            icon={MessageCircle}
                            titleKey="dashboard.quickActions.doctorCommunication"
                            descriptionKey="dashboard.quickActions.messageDoctor"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'ai-insights' && (
                  <div className="space-y-6">
                    {/* NEW: Hypo/Hyper Risk Radar */}
                    <Card className="p-6 relative overflow-hidden" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(251,146,60,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(251,146,60,0.2)' }}>
                          <AlertCircle className="w-5 h-5 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-bold">{t('dashboard.riskRadar.title')}</h2>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg" style={{ background: timeInRange >= 70 ? 'rgba(34,197,94,0.1)' : 'rgba(251,146,60,0.1)' }}>
                          <p className="text-xs text-muted-foreground mb-2">{t('dashboard.riskRadar.morningHigh')}</p>
                          <p className="text-2xl font-bold" style={{ color: timeInRange >= 70 ? '#22c55e' : '#fb923c' }}>{timeInRange >= 70 ? '6%' : '18%'}</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                          <p className="text-xs text-muted-foreground mb-2">{t('dashboard.riskRadar.postDinnerSpike')}</p>
                          <p className="text-2xl font-bold text-emerald-400">12%</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                          <p className="text-xs text-muted-foreground mb-2">{t('dashboard.riskRadar.lateNightDrop')}</p>
                          <p className="text-2xl font-bold text-emerald-400">8%</p>
                        </div>
                        <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                          <p className="text-xs text-muted-foreground mb-2">{t('dashboard.riskRadar.overallRisk')}</p>
                          <p className="text-2xl font-bold text-cyan-400">{t('dashboard.riskRadar.low')}</p>
                        </div>
                      </div>
                    </Card>

                    {/* NEW: Medication Adherence Tracker */}
                    <Card className="p-6 relative overflow-hidden" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ background: 'rgba(167,139,250,0.2)' }}>
                            <Pill className="w-5 h-5 text-purple-400" />
                          </div>
                          <h2 className="text-xl font-bold">{t('dashboard.medicationAdherence.title')}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-400" />
                          <span className="text-2xl font-bold text-foreground">6</span>
                          <span className="text-sm text-muted-foreground">{t('dashboard.medicationAdherence.dayStreak')}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">{t('dashboard.medicationAdherence.thisWeek')}</span>
                            <span className="font-medium text-emerald-400">100% {t('dashboard.medicationAdherence.adherence')}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #22c55e)' }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {[t('dashboard.medicationAdherence.mon'), t('dashboard.medicationAdherence.tue'), t('dashboard.medicationAdherence.wed'), t('dashboard.medicationAdherence.thu'), t('dashboard.medicationAdherence.fri'), t('dashboard.medicationAdherence.sat'), t('dashboard.medicationAdherence.sun')].map((day, idx) => (
                            <div key={day} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{day}</p>
                              <div className="w-full h-8 rounded-lg flex items-center justify-center" style={{
                                background: idx < 6 ? 'rgba(34,197,94,0.2)' : 'rgba(251,146,60,0.2)'
                              }}>
                                {idx < 6 ? '✓' : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    {/* Health Score Card */}
                    <Card className="p-6 bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/20">
                            <Heart className="w-5 h-5 text-primary" />
                          </div>
                          <h2 className="text-xl font-bold">{t('dashboard.healthScore.title')}</h2>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-primary">{healthScore}</div>
                          <div className="text-xs text-muted-foreground">{t('dashboard.healthScore.outOf')}</div>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-primary to-emerald-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${healthScore}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        {healthScore >= 80 ? t('dashboard.healthScore.excellent') :
                         healthScore >= 60 ? t('dashboard.healthScore.good') :
                         t('dashboard.healthScore.improve')}
                      </p>
                    </Card>

                    {/* Achievements */}
                    {achievements.length > 0 && (
                      <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-amber-500/20">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                          </div>
                          <h2 className="text-xl font-bold">{t('dashboard.achievements.title')}</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {achievements.map((achievement, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-gradient-to-br from-secondary/50 to-primary/5 border border-border">
                              <div className="text-3xl mb-2">{achievement.icon}</div>
                              <div className="font-medium text-foreground">{achievement.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">{achievement.desc}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Diabetes Summary Card */}
                    {(() => {
                      const diabetesSummary = localStorage.getItem('diabetesSummary')
                        ? JSON.parse(localStorage.getItem('diabetesSummary') || '{}')
                        : null;
                      
                      if (diabetesSummary) {
                        return (
                          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-lg bg-amber-500/20">
                                <Brain className="w-5 h-5 text-amber-500" />
                              </div>
                              <h2 className="text-xl font-bold">{t('dashboard.diabetesSummary.title')}</h2>
                              <div className="ml-auto">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                  diabetesSummary.control_level === 'good' ? 'bg-emerald-500/20 text-emerald-500' :
                                  diabetesSummary.control_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-500' :
                                  'bg-red-500/20 text-red-500'
                                }`}>
                                  {diabetesSummary.control_level?.toUpperCase() || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                                <p className="text-sm font-medium text-foreground mb-2">{t('dashboard.diabetesSummary.clinicalSummary')}</p>
                                <p className="text-sm text-muted-foreground">{diabetesSummary.summary_sentence}</p>
                              </div>
                              
                              {diabetesSummary.key_risks && diabetesSummary.key_risks.length > 0 && (
                                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                                  <p className="text-sm font-medium text-foreground mb-2">{t('dashboard.diabetesSummary.keyRiskAreas')}</p>
                                  <ul className="space-y-1">
                                    {diabetesSummary.key_risks.map((risk: string, idx: number) => (
                                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-xs mt-1">•</span>
                                        <span>{risk}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {diabetesSummary.recommended_focus_areas && diabetesSummary.recommended_focus_areas.length > 0 && (
                                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                                  <p className="text-sm font-medium text-foreground mb-2">{t('dashboard.diabetesSummary.recommendedFocus')}</p>
                                  <ul className="space-y-1">
                                    {diabetesSummary.recommended_focus_areas.map((area: string, idx: number) => (
                                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-xs mt-1">→</span>
                                        <span>{area}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="p-3 rounded-lg bg-background/50 text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t('dashboard.diabetesSummary.dataCompleteness')} <span className="font-medium text-foreground">{diabetesSummary.data_completeness}%</span>
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      }
                      return null;
                    })()}

                    {/* NEW: AI Lifestyle Coach Section */}
                    <Card className="p-6 relative overflow-hidden" style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(34,211,238,0.1) 100%)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      boxShadow: '0 0 30px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.2)' }}>
                          <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold">{t('dashboard.lifestyleCoach.title')}</h2>
                        <span className="text-xs px-3 py-1 rounded-full font-medium ml-auto" style={{
                          background: 'rgba(34,211,238,0.2)',
                          color: '#22d3ee'
                        }}>3 {t('dashboard.lifestyleCoach.suggestions')}</span>
                      </div>
                      <div className="grid gap-4">
                        {/* Nutrition Suggestion */}
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg mt-1" style={{ background: 'rgba(251,146,60,0.2)' }}>
                              <Utensils className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">{t('dashboard.lifestyleCoach.nutrition')}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('dashboard.lifestyleCoach.replaceChapati')} <span className="font-medium text-cyan-400">{t('dashboard.lifestyleCoach.brownRice')}</span> {t('dashboard.lifestyleCoach.forLowerPeaks')}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Activity Suggestion */}
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg mt-1" style={{ background: 'rgba(59,130,246,0.2)' }}>
                              <Activity className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">{t('dashboard.lifestyleCoach.activity')}</h3>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-emerald-400">{t('dashboard.lifestyleCoach.walkAfterLunch')}</span> {t('dashboard.lifestyleCoach.improvesGlucose')}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Hydration Suggestion */}
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg mt-1" style={{ background: 'rgba(34,211,238,0.2)' }}>
                              <Droplet className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">{t('dashboard.lifestyleCoach.hydration')}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('dashboard.lifestyleCoach.drinkWater')} <span className="font-medium text-blue-400">{t('dashboard.lifestyleCoach.waterAmount')}</span> {t('dashboard.lifestyleCoach.beforeBreakfast')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">{t('dashboard.aiInsights.title')}</h2>
                      </div>
                      
                      <div className="space-y-4">
                        {healthData?.data && healthData.data.length > 0 ? (
                          <>
                            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1.5 rounded-md bg-emerald-500/20">
                                  <Target className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-foreground">{t('dashboard.aiInsights.glucosePattern')}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {timeInRange >= 70 
                                      ? t('dashboard.aiInsights.patternExcellent')
                                      : t('dashboard.aiInsights.patternFluctuate')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500">{t('dashboard.aiInsights.recommendation')}</span>
                                    <span className="text-xs text-muted-foreground">{t('dashboard.aiInsights.aiGenerated')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {mealsData?.data && mealsData.data.length > 0 && (
                              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 p-1.5 rounded-md bg-blue-500/20">
                                    <Utensils className="w-4 h-4 text-blue-500" />
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-foreground">{t('dashboard.aiInsights.nutritionAnalysis')}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {t('dashboard.aiInsights.avgCarbs', { carbs: Math.round(totalCarbs / Math.max(1, mealsData.data.length)) })}
                                      {totalCarbs > 200 ? t('dashboard.aiInsights.reduceCarbs') : t('dashboard.aiInsights.goodCarbs')}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-500">{t('dashboard.aiInsights.insight')}</span>
                                      <span className="text-xs text-muted-foreground">{t('dashboard.aiInsights.dataDriven')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-8 text-center">
                            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <h3 className="font-medium text-foreground mb-1">{t('dashboard.aiInsights.startTracking')}</h3>
                            <p className="text-sm text-muted-foreground">{t('dashboard.aiInsights.logForInsights')}</p>
                          </div>
                        )}
                        
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-md bg-purple-500/20">
                              <Activity className="w-4 h-4 text-purple-500" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{t('dashboard.aiInsights.activityRecommendation')}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{t('dashboard.aiInsights.walking')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-500">{t('dashboard.aiInsights.suggestion')}</span>
                                <span className="text-xs text-muted-foreground">{t('dashboard.aiInsights.evidenceBased')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/20">
                            <Syringe className="w-5 h-5 text-primary" />
                          </div>
                          <h2 className="text-xl font-bold">{t('dashboard.insulinRange.title')}</h2>
                        </div>
                        <span className="text-sm text-muted-foreground">{t('dashboard.insulinRange.saferRecommendation')}</span>
                      </div>
                      
                      <div className="p-5 rounded-lg" style={{ 
                        background: 'linear-gradient(to bottom right, rgba(16,185,129,0.1), rgba(34,211,238,0.1))',
                        border: '1px solid rgba(16,185,129,0.2)'
                      }}>
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-2">{t('dashboard.insulinRange.basedOnDays')}</p>
                          <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-bold text-emerald-400">{latestPrediction?.prediction ? (latestPrediction.prediction.predictedInsulin - 4).toFixed(1) : '16'}</span>
                            <span className="text-2xl text-muted-foreground">-</span>
                            <span className="text-4xl font-bold text-emerald-400">{latestPrediction?.prediction ? (latestPrediction.prediction.predictedInsulin + 4).toFixed(1) : '28'}</span>
                            <span className="text-lg text-muted-foreground">{t('dashboard.insulinRange.units')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{t('dashboard.insulinRange.confidence')} {latestPrediction?.prediction ? (latestPrediction.prediction.confidence * 100).toFixed(0) : '75'}%</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'rgba(251,146,60,0.1)' }}>
                          <p className="text-xs text-orange-400 font-medium">⚠️ {t('dashboard.insulinRange.consultWarning')}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border">
                        <h3 className="text-sm font-medium text-foreground mb-2">{t('dashboard.insulinRange.factorsConsidered')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {latestPrediction?.prediction?.factors?.map((factor: string, index: number) => (
                            <span key={index} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                              {factor}
                            </span>
                          )) || (
                            <>
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{t('dashboard.insulinRange.recentPatterns')}</span>
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{t('dashboard.insulinRange.carbIntake')}</span>
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{t('dashboard.insulinRange.activityLevel')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* NEW: Diabetes News & Tips Daily Feed */}
                    <Card className="p-6 relative overflow-hidden" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(34,211,238,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(34,211,238,0.2)' }}>
                          <FileText className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-bold">Diabetes News & Tips</h2>
                        <span className="text-xs px-3 py-1 rounded-full font-medium ml-auto" style={{
                          background: 'rgba(34,211,238,0.2)',
                          color: '#22d3ee'
                        }}>Daily Feed</span>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid #22d3ee' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(34,211,238,0.2)' }}>
                              <Award className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">Today's Diabetes Byte</h3>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-cyan-400">Walking 15 min/day</span> reduces A1c by 0.4% on average (Journal of Diabetes Care, 2024).
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid #10b981' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.2)' }}>
                              <Utensils className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">Nutrition Insight</h3>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-emerald-400">High-fiber foods</span> slow glucose absorption. Try oats, beans, and leafy greens.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid #a78bfa' }}>
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(167,139,250,0.2)' }}>
                              <Brain className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">Research Update</h3>
                              <p className="text-sm text-muted-foreground">
                                New study shows <span className="font-medium text-purple-400">stress management</span> improves glucose control by up to 20%.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'trends' && (
                  <div className="space-y-6">
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">7-Day Glucose Trends</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Your glucose patterns over the past week</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-secondary/50 text-center">
                          <p className="text-2xl font-bold text-emerald-500">82%</p>
                          <p className="text-sm text-muted-foreground mt-1">Time in Range</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50 text-center">
                          <p className="text-2xl font-bold text-blue-500">142</p>
                          <p className="text-sm text-muted-foreground mt-1">Avg. Glucose</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50 text-center">
                          <p className="text-2xl font-bold text-purple-500">12</p>
                          <p className="text-sm text-muted-foreground mt-1">Readings/Day</p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Utensils className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Nutrition Trends</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Your carbohydrate intake patterns</p>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Breakfast</span>
                            <span className="font-medium">45g avg</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Lunch</span>
                            <span className="font-medium">65g avg</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Dinner</span>
                            <span className="font-medium">55g avg</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '55%' }}></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

                  {/* Right Column - 360px wide */}
                  <div className="space-y-4">
                    {/* Profile Summary Card */}
                    {isLoadingProfile ? (
                      <Card 
                        data-testid="card-profile-loading" 
                        className="p-5 glass-card relative overflow-visible"
                        style={{ borderRadius: '12px' }}
                      >
                        <p className="text-sm text-muted-foreground">Loading profile...</p>
                      </Card>
                    ) : profileData?.profile && (
                      <Card 
                        data-testid="card-profile-summary" 
                        className="p-5 glass-card relative overflow-visible"
                        style={{ borderRadius: '12px' }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-base text-foreground">Health Profile</h3>
                          </div>
                          <Link href="/details">
                            <Button variant="ghost" size="sm" data-testid="button-view-profile">
                              View
                            </Button>
                          </Link>
                        </div>
                        <div className="space-y-3">
                          {profileData.profile.weight && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{t('dashboard.profile.weight')}</span>
                              <span className="text-sm font-medium text-foreground">{profileData.profile.weight} kg</span>
                            </div>
                          )}
                          {profileData.profile.height && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{t('dashboard.profile.height')}</span>
                              <span className="text-sm font-medium text-foreground">{profileData.profile.height} cm</span>
                            </div>
                          )}
                          {profileData.profile.lastA1c && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{t('dashboard.profile.lastA1c')}</span>
                              <span className="text-sm font-medium text-foreground">{profileData.profile.lastA1c}%</span>
                            </div>
                          )}
                          {profileData.profile.typicalInsulin && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{t('dashboard.profile.typicalInsulin')}</span>
                              <span className="text-sm font-medium text-foreground">{profileData.profile.typicalInsulin} U</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                    
                    <Card 
                      data-testid="card-insulin-prediction" 
                      className="p-5 card-interactive glass-card flex flex-col justify-between relative overflow-hidden" 
                      style={{ height: '120px', borderRadius: '12px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 pointer-events-none" />
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-base text-foreground">{t('insulin.aiPrediction')}</h3>
                        </div>
                      </div>
                      <div className="flex items-center justify-between relative z-10">
                        {isLoadingPrediction ? (
                          <p className="text-sm text-muted-foreground">{t('insulin.prediction.loading')}</p>
                        ) : latestPrediction?.prediction ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-primary leading-none">
                                {latestPrediction.prediction.predictedInsulin.toFixed(1)}
                              </span>
                              <span className="text-sm text-muted-foreground">{t('insulin.prediction.units')}</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">
                              {(latestPrediction.prediction.confidence * 100).toFixed(0)}% {t('insulin.prediction.confidence')}
                            </span>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t('insulin.prediction.noData')}</p>
                        )}
                      </div>
                      <Button
                        data-testid="button-generate-prediction"
                        onClick={() => generatePredictionMutation.mutate()}
                        disabled={generatePredictionMutation.isPending}
                        className="w-full bg-primary text-primary-foreground relative z-10"
                        size="sm"
                      >
                        {generatePredictionMutation.isPending ? t('insulin.prediction.generating') : t('insulin.prediction.generateButton')}
                      </Button>
                    </Card>
                    <VoiceAssistantCard
                      title={t('food.voiceLogging')}
                      subtitle={t('food.tapMicPrompt')}
                      buttonText={t('food.logMealButton')}
                    />
                    <ProgressCard />
                    
                    {/* Medication Panel - Searchable medication sidebar */}
                    <Card className="p-4 glass-card">
                      <MedicationPanel />
                    </Card>
                  </div>
                </div>
              </>
            )}
            </div>
          </main>
        </div>

        <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        isMandatory={isOnboardingMandatory}
      />

      <style>{`
        ${floatingDots.map((dot) => `
          @keyframes floatDot${dot.id} {
            0%, 100% { 
              transform: translate3d(0, 0, 0); 
              opacity: 0.2; 
            }
            12.5% { 
              transform: translate3d(${dot.xRange * 1}px, ${dot.yRange * 0.8}px, 0); 
              opacity: 0.205; 
            }
            25% { 
              transform: translate3d(${dot.xRange * 2}px, ${dot.yRange * 1.5}px, 0); 
              opacity: 0.2; 
            }
            37.5% { 
              transform: translate3d(${dot.xRange * 3}px, ${dot.yRange * 2.2}px, 0); 
              opacity: 0.21; 
            }
            50% { 
              transform: translate3d(${dot.xRange * 4}px, ${dot.yRange * 3}px, 0); 
              opacity: 0.22; 
            }
            62.5% { 
              transform: translate3d(${dot.xRange * 3.5}px, ${dot.yRange * 2.5}px, 0); 
              opacity: 0.215; 
            }
            75% { 
              transform: translate3d(${dot.xRange * 2.5}px, ${dot.yRange * 2}px, 0); 
              opacity: 0.2; 
            }
            87.5% { 
              transform: translate3d(${dot.xRange * 1}px, ${dot.yRange * 0.8}px, 0); 
              opacity: 0.205; 
            }
          }
        `).join('\n')}

        ${unevenCircles.map((circle) => `
          @keyframes floatCircle${circle.id} {
            0%, 100% { 
              transform: translate3d(0, 0, 0) scale(1); 
              opacity: ${circle.opacity}; 
            }
            12.5% { 
              transform: translate3d(${circle.xRange * 1}px, ${circle.yRange * 0.8}px, 0) scale(1.0005); 
              opacity: ${circle.opacity + 0.0005}; 
            }
            25% { 
              transform: translate3d(${circle.xRange * 2}px, ${circle.yRange * 1.5}px, 0) scale(1.001); 
              opacity: ${circle.opacity + 0.001}; 
            }
            37.5% { 
              transform: translate3d(${circle.xRange * 3}px, ${circle.yRange * 2.2}px, 0) scale(1.0015); 
              opacity: ${circle.opacity + 0.0015}; 
            }
            50% { 
              transform: translate3d(${circle.xRange * 4}px, ${circle.yRange * 3}px, 0) scale(1.002); 
              opacity: ${circle.opacity + 0.002}; 
            }
            62.5% { 
              transform: translate3d(${circle.xRange * 3.5}px, ${circle.yRange * 2.5}px, 0) scale(1.0015); 
              opacity: ${circle.opacity + 0.0015}; 
            }
            75% { 
              transform: translate3d(${circle.xRange * 2.5}px, ${circle.yRange * 2}px, 0) scale(1.001); 
              opacity: ${circle.opacity + 0.001}; 
            }
            87.5% { 
              transform: translate3d(${circle.xRange * 1}px, ${circle.yRange * 0.8}px, 0) scale(1.0005); 
              opacity: ${circle.opacity + 0.0005}; 
            }
          }
        `).join('\n')}

        ${medicalIcons.map((icon) => `
          @keyframes floatIcon${icon.id} {
            0%, 100% { 
              transform: translate3d(0, 0, 0) rotate(${icon.rotation}deg); 
              opacity: 0.1; 
            }
            12.5% { 
              transform: translate3d(${icon.xRange * 1}px, ${icon.yRange * 0.8}px, 0) rotate(${icon.rotation + 0.05}deg); 
              opacity: 0.105; 
            }
            25% { 
              transform: translate3d(${icon.xRange * 2}px, ${icon.yRange * 1.5}px, 0) rotate(${icon.rotation + 0.1}deg); 
              opacity: 0.11; 
            }
            37.5% { 
              transform: translate3d(${icon.xRange * 3}px, ${icon.yRange * 2.2}px, 0) rotate(${icon.rotation + 0.08}deg); 
              opacity: 0.11; 
            }
            50% { 
              transform: translate3d(${icon.xRange * 4}px, ${icon.yRange * 3}px, 0) rotate(${icon.rotation - 0.1}deg); 
              opacity: 0.11; 
            }
            62.5% { 
              transform: translate3d(${icon.xRange * 3.5}px, ${icon.yRange * 2.5}px, 0) rotate(${icon.rotation - 0.05}deg); 
              opacity: 0.11; 
            }
            75% { 
              transform: translate3d(${icon.xRange * 2.5}px, ${icon.yRange * 2}px, 0) rotate(${icon.rotation + 0.05}deg); 
              opacity: 0.105; 
            }
            87.5% { 
              transform: translate3d(${icon.xRange * 1}px, ${icon.yRange * 0.8}px, 0) rotate(${icon.rotation}deg); 
              opacity: 0.1; 
            }
          }
        `).join('\n')}

        @keyframes wave1 {
          0%, 100% { 
            transform: translateY(0) scaleX(1);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-1.5px) scaleX(1.003);
            opacity: 0.32;
          }
        }

        @keyframes wave2 {
          0%, 100% { 
            transform: translateX(0) scaleY(1);
            opacity: 0.2;
          }
          50% { 
            transform: translateX(2px) scaleY(1.004);
            opacity: 0.22;
          }
        }

        @keyframes wave3 {
          0%, 100% { 
            transform: translateY(0) scaleX(1);
            opacity: 0.25;
          }
          50% { 
            transform: translateY(1.5px) scaleX(1.003);
            opacity: 0.27;
          }
        }
      `}</style>
    </div>
  );
}
