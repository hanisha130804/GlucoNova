import { useState } from 'react';
import { 
  LayoutDashboard, 
  User, 
  Heart,
  Activity,
  Droplet, 
  Utensils, 
  Pill, 
  Mic, 
  Settings,
  Upload,
  LogOut,
  FileText,
  TrendingUp,
  Bell,
  MessageCircle,
  Calendar,
  Camera,
  Sparkles,
  Users,
  FolderOpen,
  Zap,
  AlertCircle,
  BarChart3,
  BellRing,
  Brain
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import SettingsDrawer from '@/components/SettingsDrawer';
import { useTranslation } from 'react-i18next';

// Redesigned Patient navigation menu - Clean 7-item structure
const patientMenuItems = [
  { title: 'navigation.overview', icon: LayoutDashboard, url: '/dashboard', section: 'health' },
  { title: 'navigation.glucoseInsulin', icon: Activity, url: '/glucose-insulin', section: 'health' },
  { title: 'navigation.aiFoodLog', icon: Utensils, url: '/ai-food-log', section: 'health' },
  { title: 'navigation.suggestionsActivity', icon: Sparkles, url: '/suggestions-activity', section: 'health' },
  { title: 'navigation.reportsDocuments', icon: FolderOpen, url: '/reports-documents', section: 'medical' },
  { title: 'navigation.aiCoach', icon: Brain, url: '/ai-insights', section: 'ai' },
  { title: 'navigation.careTeam', icon: Users, url: '/care-team', section: 'care' },
  { title: 'navigation.settings', icon: Settings, url: '/settings', section: 'account' },
];

// Doctor navigation menu - Clinical workspace
const doctorMenuItems = [
  { title: 'navigation.overview', icon: LayoutDashboard, url: '/dashboard', section: 'clinical' },
  { title: 'navigation.patientDirectory', icon: Users, url: '/patients', section: 'patients' },
  { title: 'navigation.clinicalAlerts', icon: BellRing, url: '/alerts', section: 'patients' },
  { title: 'navigation.reportsAnalytics', icon: BarChart3, url: '/reports', section: 'analytics' },
  { title: 'navigation.messages', icon: MessageCircle, url: '/messages', section: 'communication' },
  { title: 'navigation.appointments', icon: Calendar, url: '/appointments', section: 'communication' },
  { title: 'navigation.settings', icon: Settings, url: '/settings', section: 'account' },
];

const adminMenuItems = [
  { title: 'navigation.overview', icon: LayoutDashboard, url: '/dashboard', section: 'dashboard' },
  { title: 'navigation.users', icon: User, url: '/users', section: 'management' },
  { title: 'navigation.reports', icon: FileText, url: '/reports', section: 'management' },
  { title: 'navigation.settings', icon: Settings, url: '/settings', section: 'settings' },
];

export default function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Determine which menu items to show based on user role
  const menuItems = user?.role === 'doctor' 
    ? doctorMenuItems 
    : user?.role === 'admin' 
    ? adminMenuItems 
    : patientMenuItems;

  // Debug log to verify menu items
  console.log('AppSidebar - User:', user);
  console.log('AppSidebar - User Role:', user?.role);
  console.log('AppSidebar - Menu Items Count:', menuItems.length);
  console.log('AppSidebar - Menu Items:', menuItems);
  console.log('AppSidebar - About to render', menuItems.length, 'menu items');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Comprehensive sidebar with all medical features
  const timeInRange = 85;

  return (
    <>
      <aside 
        className="fixed left-0 top-0 h-screen flex flex-col"
        style={{ 
          width: '280px',
          padding: '0',
          zIndex: 100,
          background: 'linear-gradient(180deg, #1a2332 0%, #0f1419 100%)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
          borderRight: '1px solid rgba(33, 200, 155, 0.1)',
          display: 'flex',
          position: 'fixed',
        }}
        role="navigation"
        aria-label="Main sidebar"
        data-sidebar-version="v2.0-redesigned"
      >
        {/* Scrollable content wrapper */}
        <div className="flex-1" style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header - Logo + App Name */}
          <div 
            className="flex items-center gap-3" 
            style={{ 
              flexShrink: 0,
              padding: '32px 24px 24px',
              borderBottom: '1px solid rgba(33, 200, 155, 0.1)',
              backgroundColor: 'rgba(33, 200, 155, 0.05)',
            }}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base"
              style={{
                background: 'linear-gradient(135deg, #21C89B 0%, #16A085 100%)',
                boxShadow: '0 4px 20px rgba(33, 200, 155, 0.4), 0 0 30px rgba(33, 200, 155, 0.2)',
              }}
            >
              GN
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{t('app.name')}</h1>
              <p className="text-xs text-primary" style={{ marginTop: '2px' }}>v2.0 Redesigned</p>
            </div>
          </div>

          {/* User Profile Card - Enhanced */}
          <div 
            className="rounded-xl"
            style={{
              margin: '24px 16px',
              padding: '20px',
              background: 'rgba(33, 200, 155, 0.08)',
              border: '1px solid rgba(33, 200, 155, 0.15)',
              borderRadius: '16px',
              flexShrink: 0,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar 
                className="h-12 w-12 ring-2 ring-primary/30"
                style={{
                  boxShadow: '0 4px 12px rgba(33,200,155,0.2)',
                }}
              >
                <AvatarFallback 
                  className="text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #21C89B 0%, #16A085 100%)',
                    fontSize: '18px',
                  }}
                >
                  {user?.name ? getInitials(user.name) : t('common.initials')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate" style={{ fontSize: '15px' }}>
                  {user?.name || t('common.defaultName')}
                </p>
                <p className="text-gray-400" style={{ fontSize: '13px' }}>{user?.role === 'doctor' ? t('common.doctor') : user?.role === 'admin' ? t('common.admin') : t('common.patient')}</p>
              </div>
            </div>
            <div 
              className="pt-3 border-t border-primary/10"
              style={{ fontSize: '13px' }}
            >
              <span className="text-gray-400">{t('medical.timeInRange')}: </span>
              <span className="text-primary font-semibold">{timeInRange}%</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav style={{ 
            flex: '1 1 0',
            padding: '0 16px',
            overflowY: 'auto',
            marginBottom: '16px',
          }}>
            <div className="space-y-3">
              {menuItems.map((item, index) => {
                const isActive = location === item.url;
                const Icon = item.icon;
                const showSection = index === 0 || menuItems[index - 1]?.section !== item.section;
                
                return (
                  <div key={item.title}>
                    {showSection && item.section && (
                      <div style={{ 
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '12px 18px 8px 18px',
                        marginTop: index === 0 ? '0' : '8px',
                      }}>
                        {t(`navigation.sections.${item.section}`)}
                      </div>
                    )}
                    <Link 
                      key={item.title}
                      href={item.url}
                    >
                      <button
                        className="w-full flex items-center gap-4 rounded-xl transition-all duration-300 group relative overflow-hidden"
                        style={{
                          padding: '14px 18px',
                          backgroundColor: isActive ? 'rgba(33,200,155,0.15)' : 'transparent',
                          color: isActive ? '#21C89B' : '#8B92A6',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderLeft: isActive ? '4px solid #21C89B' : '4px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(33,200,155,0.08)';
                            e.currentTarget.style.color = '#B4BCD0';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#8B92A6';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon 
                          className="flex-shrink-0" 
                          style={{ 
                            width: '18px', 
                            height: '18px', 
                            strokeWidth: 2.5,
                            color: isActive ? '#21C89B' : 'currentColor',
                          }} 
                        />
                        <span className="flex-1 text-left">{t(item.title)}</span>
                        
                        {isActive && (
                          <div 
                            className="rounded-full bg-primary"
                            style={{ width: '6px', height: '6px' }}
                          />
                        )}
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Bottom Action Buttons */}
        <div 
          className="mt-auto" 
          style={{ 
            flexShrink: 0,
            padding: '16px',
            borderTop: '1px solid rgba(33, 200, 155, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className="flex gap-3 mb-4">
            {/* Upload Report Button */}
            <Link href="/reports" className="flex-1">
              <button
                className="w-full rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  height: '56px',
                  background: 'rgba(33, 200, 155, 0.12)',
                  border: '1px solid rgba(33, 200, 155, 0.2)',
                  color: '#21C89B',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(33, 200, 155, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 200, 155, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(33, 200, 155, 0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                data-testid="button-upload"
                aria-label="Upload Report"
              >
                <Upload style={{ width: '24px', height: '24px', strokeWidth: 2.5 }} />
              </button>
            </Link>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-300"
            style={{
              padding: '14px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#FF6B6B',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
              e.currentTarget.style.color = '#FF8585';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
              e.currentTarget.style.color = '#FF6B6B';
            }}
            data-testid="button-logout"
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Settings Drawer */}
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
