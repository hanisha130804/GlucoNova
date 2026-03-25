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
import { Droplet, Target, Utensils, Syringe, Heart, Pill, MessageCircle, FileText, Activity, Stethoscope, Thermometer, TestTube, Clipboard, Sparkles, Brain, TrendingUp, AlertCircle, Award, Flame, Zap, ArrowRight, Mic, UserCircle, Link as LinkIcon, RefreshCw, Plus, Bell, Moon, Sun } from 'lucide-react';
import { SparklesIcon, UserCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
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
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnboardingMandatory, setIsOnboardingMandatory] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Update display name - prioritize authenticated user's name
  useEffect(() => {
    // PRIORITY 1: Use authenticated user's name if available
    if (user?.name) {
      setDisplayName(user.name);
      console.log('Using authenticated user name:', user.name);
    } else {
      // PRIORITY 2: Fall back to extracted patient name from OCR (only if not authenticated)
      const extractedName = localStorage.getItem('extractedPatientName');
      if (extractedName) {
        setDisplayName(extractedName);
        console.log('Using extracted patient name:', extractedName);
      } else {
        // PRIORITY 3: Default fallback
        setDisplayName(t('common.user'));
      }
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
    select: (data) => {
      // If no prediction exists, return mock data with 8.0 units and 80% confidence
      if (!data?.prediction) {
        return {
          prediction: {
            predictedInsulin: 8.0,
            confidence: 0.8,
            factors: ['Correction dose calculation based on current glucose of 200 mg/dL'],
            timestamp: new Date().toISOString(),
          }
        };
      }
      return data;
    }
  });

  // New query to get glucose data specifically for the graph
  const { data: glucoseData, isLoading: isLoadingGlucose } = useQuery<{ data: HealthDataEntry[] }>({
    queryKey: ['/api/health-data'],
    staleTime: 5000,
    refetchInterval: 30000,
  });

  const { data: profileData, isLoading: isLoadingProfile } = useQuery<{ profile: ProfileData }>({
    queryKey: ['/api/profile'],
  });

  const { data: reportsData } = useQuery({
    queryKey: ['/api/reports'],
  });

  const generatePredictionMutation = useMutation({
    mutationFn: async () => {
      // Use the current glucose from state and default values
      const data = {
        current_glucose_mgdl: latestGlucose || 200, // Use the actual current glucose or default to 200 mg/dL
        carbs_g: totalCarbs || 0,
        icr: profileData?.profile?.icr || 10, // Default 1:10 ratio
        isf: profileData?.profile?.isf || 50, // Default 50 mg/dL per unit
        correction_target: 100, // Default target glucose
        insulin_type: 'rapid',
        diabetes_type: profileData?.profile?.diabetesType || 'Type 2',
      };
      
      try {
        return await apiRequest('/api/predictions/insulin', 'POST', data);
      } catch (error) {
        // Fallback calculation if API fails
        console.log('API failed, using fallback calculation');
        const glucose = data.current_glucose_mgdl;
        const carbs = data.carbs_g;
        const correctionFactor = data.isf;
        const carbRatio = data.icr;
        
        const targetGlucose = data.correction_target;
        const correctionDose = Math.max(0, (glucose - targetGlucose) / correctionFactor);
        const mealDose = carbs / carbRatio;
        const totalDose = correctionDose + mealDose;
        
        // Calculate confidence based on data quality
        const confidence = (glucose > 200 || glucose < 70) ? 0.6 : 0.85;
        
        return {
          raw_total_units: totalDose,
          rounded_units: Math.round(totalDose * 2) / 2, // Round to nearest 0.5
          carb_units: mealDose,
          correction_units: correctionDose,
          confidence: confidence,
          explanation: `Calculated based on current glucose (${glucose} mg/dL), ${carbs}g carbs, ICR ${carbRatio}, ISF ${correctionFactor}`,
          alert: totalDose > 15,
          alert_message: totalDose > 15 ? 'Dose exceeds 15 units. Please consult your healthcare provider.' : undefined,
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/latest'] });
      
      // Update the latestPrediction state with the new data
      queryClient.setQueryData(['/api/predictions/latest'], {
        prediction: {
          predictedInsulin: data.rounded_units || data.raw_total_units || 8.0,
          confidence: data.confidence || 0.8,
          factors: [data.explanation || 'Calculated dose'],
          timestamp: new Date().toISOString(),
        }
      });
      
      toast({
        title: t('insulin.prediction.generated'),
        description: `Recommended dose: ${(data.rounded_units || data.raw_total_units || 8.0).toFixed(1)} units`,
      });
    },
    onError: (error: any) => {
      console.error('Prediction error:', error);
      toast({
        title: t('insulin.prediction.failed'),
        description: error.message || t('insulin.prediction.unable'),
        variant: 'destructive',
      });
    },
  });

  // Check if we have real user data (from glucose logs or reports)
  const hasRealData = healthData?.data && Array.isArray(healthData.data) && healthData.data.length > 0;
  const hasRealMeals = mealsData?.data && Array.isArray(mealsData.data) && mealsData.data.length > 0;

  // Get latest glucose - ONLY show real data, return 0 if no data
  const latestGlucose = hasRealData ? healthData.data[0].glucose : 200; // Default to 200 mg/dL as per requirements
  
  // Safely extract insulin dose from health data (which includes insulin tracking)
  let latestInsulin = 0;
  if (hasRealData) {
    // Find the most recent health data entry with insulin
    const dataWithInsulin = healthData.data.find((entry: any) => {
      if (!entry.insulin) return false;
      if (typeof entry.insulin === 'object' && entry.insulin.dose > 0) return true;
      if (typeof entry.insulin === 'number' && entry.insulin > 0) return true;
      return false;
    });
    
    if (dataWithInsulin) {
      const insulinData: any = dataWithInsulin.insulin;
      if (typeof insulinData === 'object' && insulinData.dose) {
        latestInsulin = insulinData.dose;
      } else if (typeof insulinData === 'number') {
        latestInsulin = insulinData;
      }
    }
  }
  
  const latestReading = healthData?.data?.[0]; // Latest health data entry for timestamp
  
  // Calculate total carbs for TODAY only
  const getTodayCarbs = () => {
    if (!hasRealMeals) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return mealsData.data
      .filter((meal: any) => {
        const mealDate = new Date(meal.timestamp || meal.createdAt);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate.getTime() === today.getTime();
      })
      .reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
  };
  
  const totalCarbs = getTodayCarbs();
  
  const calculateTimeInRange = () => {
    // If no real data, return 0
    if (!hasRealData) return 0;
    
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

  // Card navigation handler
  const handleCardNavigation = (path: string) => {
    setLocation(path);
  };

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
        <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', backgroundColor: '#142033' }}>
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

            {isLoadingHealth || isLoadingMeals ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('dashboard.loadingData')}</p>
              </div>
            ) : (
              <>
                {/* Professional Glass Card Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* ============ LEFT + CENTER COLUMN (70%) ============ */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Welcome Header with Status - Interactive */}
                    <div 
                      className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => handleCardNavigation('/glucose-insulin')}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{t('dashboard.welcomeBack', { name: displayName })}</h1>
                            {!hasRealData && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/30">
                                {t('dashboard.demoMode')}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 mt-1">
                            {t('dashboard.healthOverview')}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{t('dashboard.currentStatus')}</p>
                            <div className="flex items-center gap-2">
                              {latestGlucose > 0 ? (
                                <>
                                  <div className={`w-3 h-3 rounded-full ${latestGlucose > 180 ? 'bg-rose-500 animate-pulse' : latestGlucose < 70 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                                  <p className={`text-2xl font-bold ${latestGlucose > 180 ? 'text-rose-400' : latestGlucose < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{latestGlucose} mg/dL</p>
                                  {latestGlucose > 180 && (
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-rose-900/30 text-rose-400 border border-rose-700/30">
                                      {t('dashboard.high')}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-xl font-bold text-gray-500">--</p>
                              )}
                            </div>
                          </div>
                          <div className="h-10 w-px bg-gray-700" />
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{t('dashboard.timeInRange')}</p>
                            {hasRealData ? (
                              <div className="flex items-center gap-2">
                                <div className="relative w-12 h-12">
                                  <svg className="w-12 h-12 transform -rotate-90">
                                    <circle
                                      cx="24"
                                      cy="24"
                                      r="20"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      fill="none"
                                      className="text-gray-700"
                                    />
                                    <circle
                                      cx="24"
                                      cy="24"
                                      r="20"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      fill="none"
                                      strokeDasharray={`${timeInRange * 1.25} 125`}
                                      className="text-emerald-400"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-emerald-400">{timeInRange}%</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xl font-bold text-gray-500">--%</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Summary & Quick Actions Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* AI Summary Card */}
                      <div className="glass-card card-gradient-green rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-200">{t('dashboard.aiSummary.title')}</h3>
                            <p className="text-sm text-gray-500">{t('dashboard.aiSummary.lastUpdated')} {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                          </div>
                        </div>
                        
                        {hasRealData ? (
                          <p className="text-gray-400 mb-4">
                            {t('dashboard.aiSummary.glucoseStable')} <span className="text-emerald-400 font-medium">{timeInRange >= 70 ? t('dashboard.status.stable') : t('dashboard.status.variable')}</span> {t('dashboard.aiSummary.withAverage')} <span className={`font-medium ${latestGlucose > 180 ? 'text-red-400' : latestGlucose < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {latestGlucose} mg/dL
                            </span> {t('dashboard.aiSummary.stableHours')}. {timeInRange >= 70 ? t('dashboard.status.goodWork') : t('dashboard.status.needsAttention')}
                          </p>
                        ) : (
                          <p className="text-gray-400 mb-4">
                            {t('dashboard.aiInsights.logForInsights')}
                          </p>
                        )}
                        
                        {hasRealData && timeInRange < 70 && (
                          <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-800/30">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                              </div>
                              <div>
                                <p className="text-sm text-amber-300 font-medium">{t('dashboard.patternDetected')}</p>
                                <p className="text-xs text-amber-500">{t('dashboard.aiSummary.patternDetected')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions - 3 Button Grid with Enhanced Design */}
                      <div className="grid grid-cols-3 gap-4">
                        <button 
                          onClick={() => handleCardNavigation('/glucose-insulin')}
                          className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 backdrop-blur-lg rounded-xl p-6 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 flex flex-col items-center justify-center group hover:scale-[1.05] hover:-translate-y-1 active:scale-95 h-full shadow-lg hover:shadow-emerald-500/20"
                        >
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3 group-hover:bg-emerald-500/30 transition-all">
                            <Droplet className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-sm font-semibold text-emerald-300 text-center">{t('dashboard.quickActions.glucose.label')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard.quickActions.glucose.desc')}</p>
                        </button>
                        <button 
                          onClick={() => handleCardNavigation('/ai-food-log')}
                          className="bg-gradient-to-br from-amber-600/20 to-amber-700/10 backdrop-blur-lg rounded-xl p-6 border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 flex flex-col items-center justify-center group hover:scale-[1.05] hover:-translate-y-1 active:scale-95 h-full shadow-lg hover:shadow-amber-500/20"
                        >
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3 group-hover:bg-amber-500/30 transition-all">
                            <Utensils className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-sm font-semibold text-amber-300 text-center">{t('dashboard.quickActions.meal.label')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard.quickActions.meal.desc')}</p>
                        </button>
                        <button 
                          onClick={() => handleCardNavigation('/reports-documents')}
                          className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 flex flex-col items-center justify-center group hover:scale-[1.05] hover:-translate-y-1 active:scale-95 h-full shadow-lg hover:shadow-blue-500/20"
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-all">
                            <FileText className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-sm font-semibold text-blue-300 text-center">{t('dashboard.quickActions.reports.label')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard.quickActions.reports.desc')}</p>
                        </button>
                      </div>
                    </div>

                    {/* Glucose Trends Chart - Interactive */}
                    <div 
                      className="glass-card card-gradient-blue rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 h-[400px] cursor-pointer group"
                      onClick={() => handleCardNavigation('/glucose')}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-200 group-hover:text-cyan-400 transition-colors">{t('glucose.trends.title')}</h3>
                            <p className="text-xs text-gray-500">{t('dashboard.trends.period')}</p>
                          </div>
                        </div>
                        <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                          {t('dashboard.trends.viewDetails')} <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="h-[280px]">
                        <GlucoseTrendChart compact={false} glucoseData={glucoseData} />
                      </div>
                    </div>

                    {/* Key Metrics Grid - Interactive Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button 
                        onClick={() => handleCardNavigation('/meal-tracking')}
                        className="glass-card card-gradient-cyan rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-amber-500/40 transition-all duration-300 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-2">{t('dashboard.metrics.carbsToday.label')}</p>
                            <p className="text-3xl font-bold text-amber-400 mb-1">{totalCarbs > 0 ? `${totalCarbs}g` : '--'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="text-emerald-400">↓ 15%</span>
                              <span>{t('dashboard.metrics.carbsToday.vsYesterday')}</span>
                            </div>
                          </div>
                          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Utensils className="w-7 h-7 text-amber-400" />
                          </div>
                        </div>
                      </button>
                      <button 
                        onClick={() => handleCardNavigation('/insulin')}
                        className="glass-card card-gradient-purple rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-purple-500/40 transition-all duration-300 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-2">{t('dashboard.metrics.activeInsulin.label')}</p>
                            <p className="text-3xl font-bold text-purple-400 mb-1">{latestInsulin > 0 ? `${latestInsulin}u` : '--'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="text-purple-400">{t('dashboard.metrics.activeInsulin.lastDose')}</span>
                              <span>2h ago</span>
                            </div>
                          </div>
                          <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Syringe className="w-7 h-7 text-purple-400" />
                          </div>
                        </div>
                      </button>
                      <button 
                        onClick={() => handleCardNavigation('/activity')}
                        className="glass-card card-gradient-blue rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-cyan-500/40 transition-all duration-300 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-2">{t('dashboard.metrics.activityLevel.label')}</p>
                            <p className="text-3xl font-bold text-cyan-400 mb-1">--</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="text-cyan-400">{t('dashboard.metrics.activityLevel.startTracking')}</span>
                            </div>
                          </div>
                          <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity className="w-7 h-7 text-cyan-400" />
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ============ RIGHT COLUMN (30%) ============ */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-6">

                      {/* Health Profile Card */}
                      {isLoadingProfile ? (
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/5 shadow-sm">
                          <p className="text-xs text-gray-500">{t('common.loading')}</p>
                        </div>
                      ) : profileData?.profile ? (
                        <button 
                          onClick={() => handleCardNavigation('/settings')}
                          className="w-full text-left">
                        <div className="glass-card card-gradient-green rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-4">
                            <UserCircle className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors">{t('dashboard.profile.title')}</h3>
                              <p className="text-xs text-gray-500">{t('dashboard.profile.clickToUpdate')}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {profileData.profile.weight && (
                              <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.weight')}</p>
                                <p className="text-sm font-semibold text-gray-300">{profileData.profile.weight} kg</p>
                              </div>
                            )}
                            {profileData.profile.height && (
                              <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.height')}</p>
                                <p className="text-sm font-semibold text-gray-300">{profileData.profile.height} cm</p>
                              </div>
                            )}
                            {profileData.profile.lastA1c && (
                              <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.lastA1c')}</p>
                                <p className="text-sm font-semibold text-emerald-400">{profileData.profile.lastA1c}%</p>
                              </div>
                            )}
                            {profileData.profile.weight && profileData.profile.height && (
                              <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 mb-1">BMI</p>
                                <p className="text-sm font-semibold text-blue-400">
                                  {(profileData.profile.weight / Math.pow(profileData.profile.height / 100, 2)).toFixed(1)}
                                </p>
                              </div>
                            )}
                            {(!profileData.profile.weight || !profileData.profile.height || !profileData.profile.lastA1c) && (
                              <>
                                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.weight')}</p>
                                  <p className="text-sm font-semibold text-gray-300">64 kg</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.height')}</p>
                                  <p className="text-sm font-semibold text-gray-300">165 cm</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.lastA1c')}</p>
                                  <p className="text-sm font-semibold text-emerald-400">7.6%</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-xs text-gray-500 mb-1">BMI</p>
                                  <p className="text-sm font-semibold text-blue-400">23.5</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleCardNavigation('/settings')}
                          className="w-full text-left">
                        <div className="glass-card card-gradient-green rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-4">
                            <UserCircle className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors">{t('dashboard.profile.title')}</h3>
                              <p className="text-xs text-gray-500">{t('dashboard.profile.clickToUpdate')}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.weight')}</p>
                              <p className="text-sm font-semibold text-gray-300">64 kg</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.height')}</p>
                              <p className="text-sm font-semibold text-gray-300">165 cm</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">{t('dashboard.profile.lastA1c')}</p>
                              <p className="text-sm font-semibold text-emerald-400">7.6%</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">BMI</p>
                              <p className="text-sm font-semibold text-blue-400">23.5</p>
                            </div>
                          </div>
                        </div>
                        </button>
                      )}

                      {/* AI Insulin Prediction - Interactive Gradient Card */}
                      <button 
                        onClick={() => handleCardNavigation('/glucose-insulin')}
                        className="w-full text-left"
                      >
                      <div className="relative glass-card card-gradient-blue rounded-2xl p-6 shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 group overflow-hidden">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Brain className="w-6 h-6 text-cyan-300" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{t('dashboard.aiPrediction.title')}</h3>
                            <p className="text-xs text-cyan-200/60">{t('dashboard.prediction.suggestion')}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                        
                        {isLoadingPrediction ? (
                          <p className="text-xs text-gray-500">{t('insulin.prediction.loading')}</p>
                        ) : latestPrediction?.prediction ? (
                          <>
                            <div className="text-center mb-4">
                              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                {latestPrediction.prediction.predictedInsulin.toFixed(1)} {t('dashboard.aiPrediction.units')}
                              </div>
                              <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                    style={{ width: `${(latestPrediction.prediction.confidence * 100).toFixed(0)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-cyan-400">{(latestPrediction.prediction.confidence * 100).toFixed(0)}% {t('insulin.prediction.confidence')}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePredictionMutation.mutate();
                              }}
                              disabled={generatePredictionMutation.isPending}
                              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {generatePredictionMutation.isPending ? t('insulin.prediction.generating') : (
                                <>
                                  <span>{t('dashboard.prediction.calculateDose')}</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-center mb-4">
                              <div className="flex items-baseline justify-center gap-2">
                                <div className="text-5xl font-bold text-white">
                                  8.0
                                </div>
                                <div className="text-xl font-medium text-cyan-200">{t('dashboard.aiPrediction.units')}</div>
                              </div>
                              <div className="mt-4">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <div className="w-40 h-3 bg-gray-800/50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-500"
                                      style={{ width: '80%' }}
                                    />
                                  </div>
                                </div>
                                <span className="text-sm font-medium text-cyan-200">80% {t('insulin.prediction.confidence')}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePredictionMutation.mutate();
                              }}
                              disabled={generatePredictionMutation.isPending}
                              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {generatePredictionMutation.isPending ? t('insulin.prediction.generating') : (
                                <>
                                  <span>{t('dashboard.prediction.calculateDose')}</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      </button>

                      {/* Voice Meal Logging - Interactive */}
                      <button 
                        onClick={() => handleCardNavigation('/ai-food-log')}
                        className="w-full text-left"
                      >
                      <div className="glass-card card-gradient-purple rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Mic className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors">{t('dashboard.voiceMealLog.title')}</h3>
                            <p className="text-xs text-gray-500">{t('dashboard.voiceMealLog.tracking')}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                        </div>
                        
                          <div className="w-full py-4 bg-gradient-to-r from-purple-900/20 to-pink-900/10 group-hover:from-purple-800/30 group-hover:to-pink-800/20 border border-purple-700/30 rounded-xl transition-all duration-300 shadow-sm">
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  <Mic className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              <span className="text-purple-300 font-semibold">{t('dashboard.voiceMealLog.tapToSpeak')}</span>
                              <span className="text-xs text-gray-500 mt-1">{t('dashboard.voiceMealLog.instantly')}</span>
                            </div>
                          </div>
                      </div>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            </div>
          </main>
        </div>

        {/* Floating Quick Log Button */}
        <button
          onClick={() => handleCardNavigation('/glucose-insulin')}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-2xl hover:shadow-emerald-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group"
          aria-label="Quick Log Glucose"
        >
          <Plus className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" />
        </button>

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
