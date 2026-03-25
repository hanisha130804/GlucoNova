import { useState, FormEvent, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { User, Stethoscope, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FloatingParticles from '@/components/FloatingParticles';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Remove unused animation data
  const floatingDots: never[] = [];
  const unevenCircles: never[] = [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    
    if (!roleParam || (roleParam !== 'patient' && roleParam !== 'doctor')) {
      navigate('/role-selection');
      return;
    }
    
    setRole(roleParam as 'patient' | 'doctor');
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      navigate('/role-selection');
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await register(name, email, password, role);
      
      // Clear all previous onboarding flags for new registration
      localStorage.removeItem('onboardingCompleted');
      localStorage.removeItem('onboardingSkipped');
      localStorage.removeItem('skipAuth');
      
      // Mark as new user for mandatory onboarding
      localStorage.setItem('isNewUser', 'true');
      
      console.log('=== New User Registration ===');
      console.log('Cleared old flags, set isNewUser=true');
      
      toast({
        title: t('auth.registrationSuccess'),
        description: t('auth.welcomeMessage'),
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: t('auth.registrationFailed'),
        description: error.message || t('auth.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Emerald Spotlight */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.08) 40%, transparent 70%)',
            animation: 'softPulse 8s ease-in-out infinite'
          }}
        />
        
        {/* Optimized Background Particles - Reduced Count, Larger Sizes */}
        {/* Background Layer - Behind card with selective blur */}
        <FloatingParticles 
          count={9} 
          color="emerald" 
          opacity={39} 
          minSize={16} 
          maxSize={28} 
          minDuration={26} 
          maxDuration={40} 
          layer="background" 
        />
        
        {/* Foreground Layer - Sharp particles in front of card */}
        <FloatingParticles 
          count={7} 
          color="emeraldLight" 
          opacity={52} 
          minSize={12} 
          maxSize={22} 
          minDuration={20} 
          maxDuration={33} 
          layer="foreground" 
        />
      </div>

      {/* Main Content */}
      <main className="relative flex items-center justify-center w-full z-10">
        {/* Floating Glass Registration Card */}
        <div className="floating-card group relative w-full max-w-xl backdrop-blur-xl rounded-3xl px-10 py-12 shadow-xl hover:shadow-2xl transition-all duration-400 border border-emerald-500/10 hover:border-emerald-500/20"
          style={{
            backgroundColor: '#0f172a',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.70) 100%)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Enhanced Glow on Hover */}
          <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-emerald-500/8 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 -z-10" />
          
          {/* Header */}
          <h1 className="text-2xl font-bold text-white text-center">{t('app.name')}</h1>
          <p className="text-sm text-emerald-400 text-center mt-1">{t('auth.createAccount')}</p>
          
          {/* Role Pill */}
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs backdrop-blur-xl">
              {role === 'patient' ? (
                <User className="h-4 w-4" />
              ) : (
                <Stethoscope className="h-4 w-4" />
              )}
              <span className="font-medium">
                {role === 'patient' ? t('common.patient') : t('auth.selectRole.healthcareProvider')}
              </span>
            </span>
          </div>
        
          {/* Vertical Form Fields */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-medium text-slate-200">
                {t('auth.fullName')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3.5 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder={t('auth.enterFullName')}
                required
                disabled={isLoading}
                data-testid="input-name"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-medium text-slate-200">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3.5 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder={t('auth.emailPlaceholder')}
                required
                disabled={isLoading}
                data-testid="input-email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-medium text-slate-200">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-11 bg-white/5 border border-white/12 rounded-xl px-4 py-3.5 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                  placeholder={t('auth.createPassword')}
                  required
                  disabled={isLoading}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-slate-200">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pr-11 bg-white/5 border border-white/12 rounded-xl px-4 py-3.5 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                  placeholder={t('auth.reEnterPassword')}
                  required
                  disabled={isLoading}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20">
              <p className="text-xs text-slate-300">
                {t('auth.accountReviewNotice')}
              </p>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-semibold py-3.5 rounded-xl shadow-[0_16px_40px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:translate-y-0.5 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-create-account"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  {t('auth.creatingAccount')}
                </span>
              ) : t('auth.createAccount')}
            </button>
          </form>

          {/* Bottom Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link 
                href="/login" 
                className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium" 
                data-testid="link-login"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                {t('auth.login')}
              </Link>
            </p>
          </div>
          
          {/* Back to Role Selection */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <Link 
              href="/role-selection" 
              className="inline-flex items-center gap-2 text-sm text-emerald-400/80 hover:text-emerald-300 transition-colors"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                window.history.pushState({}, '', '/role-selection');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              <span>←</span>
              <span>{t('auth.backToRoles')}</span>
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        /* Floating card animation */
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        
        .floating-card {
          animation: cardFloat 7s ease-in-out infinite;
        }
        
        /* Slow float for particles */
        @keyframes slowFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        /* Soft pulse for spotlight */
        @keyframes softPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
