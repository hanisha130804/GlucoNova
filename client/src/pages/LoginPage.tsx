import { useState, FormEvent, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FloatingParticles from '@/components/FloatingParticles';
import { apiRequest } from '@/lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  console.log('LoginPage component rendering...');
  
  useEffect(() => {
    console.log('LoginPage mounted successfully');
  }, []);
  
  const [, navigate] = useLocation();
  const { setSkipAuthUser, login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSkip = () => {
    setShowRoleModal(true);
  };

  const handleRoleSelect = (role: 'patient' | 'doctor') => {
    setShowRoleModal(false);
    
    // CRITICAL: Clear all previous onboarding flags for fresh skip-auth session
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('onboardingSkipped');
    
    // Use the auth context function to set skip auth user
    setSkipAuthUser(role);
    
    // Mark as new user for mandatory onboarding
    localStorage.setItem('isNewUser', 'true');
    localStorage.setItem('skipAuth', 'true'); // Ensure skipAuth is set
    
    console.log('=== Skip-Auth Session Started ===');
    console.log('Cleared onboarding flags, set isNewUser=true, skipAuth=true');
    
    // Navigate based on role
    navigate(role === 'patient' ? '/dashboard' : '/dashboard');
  };

  // Remove unused animation data
  const floatingDots: never[] = [];
  const unevenCircles: never[] = [];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Login attempt for:', email);
      await login(email, password);
      
      // Wait a moment to ensure token is properly set after login
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user profile to check onboarding status from database
      try {
        const token = localStorage.getItem('token');
        console.log('Token available for profile request:', !!token);
        
        const profileData = await apiRequest('/profile');
        
        console.log('Profile data received:', profileData);
        
        // For authenticated login, clear skip-auth flags
        localStorage.removeItem('skipAuth');
        localStorage.removeItem('onboardingSkipped');
        
        // Check if user has completed onboarding by checking for profile data
        const hasProfileData = profileData?.profile && Object.keys(profileData.profile || {}).length > 0;
        
        if (!hasProfileData) {
          // If user doesn't have profile data, they need to complete onboarding
          localStorage.setItem('isNewUser', 'true');
          localStorage.removeItem('onboardingCompleted'); // Ensure flag is not set
          
          console.log('=== New User Login ===');
          console.log('No profile data found - setting onboarding flags');
        } else {
          // If user has profile data, they've likely completed onboarding
          localStorage.setItem('onboardingCompleted', 'true');
          localStorage.removeItem('isNewUser');
          
          console.log('=== Returning User Login ===');
          console.log('Profile data exists - onboarding considered completed');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', error instanceof Error ? error.message : error);
        
        // If profile fetch fails, assume user needs onboarding
        // Clear skip-auth flag since this is authenticated login
        localStorage.removeItem('skipAuth');
        localStorage.removeItem('onboardingSkipped');
        
        // Mark as new user for mandatory onboarding
        localStorage.setItem('isNewUser', 'true');
        
        console.log('=== New User Login ===');
        console.log('Set isNewUser=true for mandatory onboarding (profile fetch error)');
      }
      
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack'),
      });
      
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      // Improve error message clarity for users
      let displayMessage = errorMessage;
      if (errorMessage.includes('Invalid credentials')) {
        displayMessage = 'Invalid email or password. Please check your credentials or register a new account.';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        displayMessage = 'Authentication failed. Please try again or create a new account.';
      }
      
      setError(displayMessage);
      toast({
        title: t('auth.loginError'),
        description: displayMessage,
        variant: 'destructive',
      });
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Skip for Now Button - Top Right */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 px-4 py-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition-colors duration-300 hover:bg-emerald-400/10 rounded-lg border border-emerald-400/20 backdrop-blur-sm z-30"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        {t('onboarding.skipForNow')} →
      </button>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-8 max-w-md w-full border border-emerald-500/20 shadow-2xl backdrop-blur-3xl"
            style={{
              backdropFilter: 'blur(30px) brightness(1.05)',
              WebkitBackdropFilter: 'blur(30px) brightness(1.05)',
              boxShadow: '0 8px 32px rgba(45, 212, 191, 0.12)'
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-2 text-center">{t('auth.selectRole.title')}</h2>
            <p className="text-gray-300 text-center mb-8 text-sm">{t('auth.selectRole.description')}</p>

            <div className="space-y-4">
              {/* Patient Option */}
              <button
                onClick={() => handleRoleSelect('patient')}
                className="w-full group relative rounded-xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.02] overflow-hidden border-2"
                style={{
                  background: 'rgba(30, 30, 50, 0.4)',
                  borderColor: 'rgba(45, 212, 191, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'rgba(45, 212, 191, 0.15)',
                        border: '1.5px solid rgba(45, 212, 191, 0.4)'
                      }}
                    >
                      <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">{t('common.patient')}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{t('auth.selectRole.patientDescription')}</p>
                </div>
              </button>

              {/* Doctor Option */}
              <button
                onClick={() => handleRoleSelect('doctor')}
                className="w-full group relative rounded-xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.02] overflow-hidden border-2"
                style={{
                  background: 'rgba(30, 30, 50, 0.4)',
                  borderColor: 'rgba(45, 212, 191, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'rgba(45, 212, 191, 0.15)',
                        border: '1.5px solid rgba(45, 212, 191, 0.4)'
                      }}
                    >
                      <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V6.75m-10-3v3m5-3v3m-8 3h14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">{t('auth.selectRole.healthcareProvider')}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{t('auth.selectRole.providerDescription')}</p>
                </div>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full mt-6 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors border border-gray-600/30 rounded-lg hover:bg-gray-600/10"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {/* Optimized Background Particles - Reduced Count, Larger Sizes */}
      {/* Background Layer - Behind card with selective blur */}
      <FloatingParticles 
        count={8} 
        color="emerald" 
        opacity={38} 
        minSize={16} 
        maxSize={28} 
        minDuration={25} 
        maxDuration={40} 
        layer="background" 
      />
      
      {/* Foreground Layer - Sharp particles in front of card */}
      <FloatingParticles 
        count={6} 
        color="emeraldLight" 
        opacity={50} 
        minSize={12} 
        maxSize={22} 
        minDuration={20} 
        maxDuration={32} 
        layer="foreground" 
      />

      {/* Header Spacer */}
      <div className="flex-1"></div>

      {/* Main Content - Centered Login Card */}
      <div className="flex items-center justify-center px-4 py-8">
        <div className="floating-card group relative w-full max-w-2xl backdrop-blur-xl rounded-3xl px-16 py-16 shadow-xl hover:shadow-2xl transition-all duration-400 border border-emerald-500/10 hover:border-emerald-500/20"
          style={{
            backgroundColor: '#0f172a',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.70) 100%)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Subtle Glow on Hover */}
          <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-emerald-500/8 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 -z-10" />
          
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold tracking-tight text-white mb-3">GlucoNova</h1>
            <p className="text-lg font-semibold text-emerald-400">Login</p>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              <div className="font-semibold mb-2">❌ {error}</div>
              <div className="text-xs text-red-300">
                💡 First time? You need to <Link 
                  href="/role-selection" 
                  className="underline text-red-200 hover:text-red-100"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/role-selection');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >create an account</Link> before logging in.
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-200 mb-2 block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/12 rounded-xl px-5 py-4 text-lg text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder="email@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-200 mb-2 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12 bg-white/5 border border-white/12 rounded-xl px-5 py-4 text-lg text-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-base">
              <label className="flex items-center text-slate-300">
                <input type="checkbox" className="w-5 h-5 rounded mr-3" style={{ accentColor: '#10b981' }} />
                Remember me
              </label>
              <Link href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-semibold py-4 text-lg rounded-xl shadow-[0_16px_40px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:translate-y-0.5 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-base text-slate-400">
              Don't have an account?{' '}
              <Link 
                href="/role-selection" 
                className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/role-selection');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-slate-500">
              © 2025 GlucoNova. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Spacer */}
      <div className="flex-1"></div>

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
      `}</style>
    </div>
  );
}