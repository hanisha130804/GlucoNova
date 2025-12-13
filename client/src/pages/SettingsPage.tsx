import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n/config';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Globe,
  Shield,
  Moon,
  Sun,
  Mail,
  Lock,
  Languages,
  Smartphone,
  Clock,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [glucoseAlerts, setGlucoseAlerts] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);

  const handleLanguageChange = (language: string) => {
    // Use centralized changeLanguage to update localStorage and i18n
    changeLanguage(language);
    toast({
      title: t('settings.languageChanged'),
      description: t('settings.languageChangedDesc'),
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: t('settings.saved'),
      description: t('settings.savedDesc'),
    });
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}>
      <AppSidebar />
      
      <main className="flex-1" style={{ marginLeft: '280px', padding: '40px' }}>
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{t('settings.title')}</h1>
              <p className="text-gray-400">{t('settings.subtitle')}</p>
            </div>
            <Button onClick={handleSaveSettings} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {t('settings.saveChanges')}
            </Button>
          </div>

          {/* Account Settings */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="w-5 h-5 text-primary" />
                {t('settings.accountSettings')}
              </CardTitle>
              <CardDescription>{t('settings.accountSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">{t('settings.fullName')}</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name}
                    className="bg-secondary/50 border-primary/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">{t('settings.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user ? (user as any).email || '' : ''}
                    className="bg-secondary/50 border-primary/20 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">{t('settings.accountType')}</Label>
                <Input
                  id="role"
                  value={user?.role === 'doctor' ? t('common.doctor') : user?.role === 'admin' ? t('common.admin') : t('common.patient')}
                  disabled
                  className="bg-secondary/30 border-primary/10 text-gray-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-primary" />
                {t('settings.languageRegion')}
              </CardTitle>
              <CardDescription>{t('settings.languageRegionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-white flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {t('settings.language')}
                  </Label>
                  <Select value={i18n.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="bg-secondary/50 border-primary/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                      <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                      <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                      <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                      <SelectItem value="or">ଓଡ଼ିଆ (Odia)</SelectItem>
                      <SelectItem value="as">অসমীয়া (Assamese)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('settings.timezone')}
                  </Label>
                  <Select defaultValue="ist">
                    <SelectTrigger className="bg-secondary/50 border-primary/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ist">IST (India Standard Time)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">EST (Eastern)</SelectItem>
                      <SelectItem value="pst">PST (Pacific)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bell className="w-5 h-5 text-primary" />
                {t('settings.notifications')}
              </CardTitle>
              <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-white flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {t('settings.emailNotifications')}
                    </Label>
                    <p className="text-sm text-gray-400">{t('settings.emailNotificationsDesc')}</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {t('settings.pushNotifications')}
                    </Label>
                    <p className="text-sm text-gray-400">{t('settings.pushNotificationsDesc')}</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                {user?.role === 'patient' && (
                  <>
                    <div className="flex items-center justify-between py-3 border-b border-primary/10">
                      <div className="space-y-0.5">
                        <Label className="text-white">{t('settings.glucoseAlerts')}</Label>
                        <p className="text-sm text-gray-400">{t('settings.glucoseAlertsDesc')}</p>
                      </div>
                      <Switch
                        checked={glucoseAlerts}
                        onCheckedChange={setGlucoseAlerts}
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <Label className="text-white">{t('settings.medicationReminders')}</Label>
                        <p className="text-sm text-gray-400">{t('settings.medicationRemindersDesc')}</p>
                      </div>
                      <Switch
                        checked={medicationReminders}
                        onCheckedChange={setMedicationReminders}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-primary" />
                {t('settings.privacySecurity')}
              </CardTitle>
              <CardDescription>{t('settings.privacySecurityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-white flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {t('settings.changePassword')}
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder={t('settings.currentPassword')}
                    className="bg-secondary/50 border-primary/20 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="password"
                    placeholder={t('settings.newPassword')}
                    className="bg-secondary/50 border-primary/20 text-white"
                  />
                  <Input
                    type="password"
                    placeholder={t('settings.confirmPassword')}
                    className="bg-secondary/50 border-primary/20 text-white"
                  />
                </div>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  {t('settings.updatePassword')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                {t('settings.appearance')}
              </CardTitle>
              <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <Label className="text-white">{t('settings.darkMode')}</Label>
                  <p className="text-sm text-gray-400">{t('settings.darkModeDesc')}</p>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={setIsDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button at Bottom */}
          <div className="flex justify-end pt-6 pb-12">
            <Button onClick={handleSaveSettings} size="lg" className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {t('settings.saveChanges')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
