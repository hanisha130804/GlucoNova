import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Users, Heart, MessageCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

export default function CareTeamPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('doctors');

  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ['/api/doctors'],
  });

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('careTeam.title')}</h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('careTeam.yourCareTeam')}</h1>
              <p className="text-muted-foreground">{t('careTeam.description')}</p>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('doctors')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'doctors' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'doctors' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'doctors' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <Heart className="w-4 h-4 inline mr-2" />
                {t('careTeam.tabs.doctors')}
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'messages' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'messages' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'messages' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                {t('careTeam.tabs.messages')}
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'appointments' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'appointments' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'appointments' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('careTeam.tabs.appointments')}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('careTeam.loading')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'doctors' && (
                  <Link href="/doctors">
                    <Card className="p-8 glass-card">
                      <div className="text-center">
                        <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('careTeam.doctors.title')}</h3>
                        <p className="text-muted-foreground mb-6">
                          {t('careTeam.doctors.description')}
                        </p>
                        <Button className="bg-primary hover:bg-primary/90">
                          {t('careTeam.doctors.viewButton')}
                        </Button>
                      </div>
                    </Card>
                  </Link>
                )}

                {activeTab === 'messages' && (
                  <Link href="/messages">
                    <Card className="p-8 glass-card">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('careTeam.messages.title')}</h3>
                        <p className="text-muted-foreground mb-6">
                          {t('careTeam.messages.description')}
                        </p>
                        <Button className="bg-primary hover:bg-primary/90">
                          {t('careTeam.messages.goToButton')}
                        </Button>
                      </div>
                    </Card>
                  </Link>
                )}

                {activeTab === 'appointments' && (
                  <Link href="/appointments">
                    <Card className="p-8 glass-card">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('careTeam.appointments.title')}</h3>
                        <p className="text-muted-foreground mb-6">
                          {t('careTeam.appointments.description')}
                        </p>
                        <Button className="bg-primary hover:bg-primary/90">
                          {t('careTeam.appointments.goToButton')}
                        </Button>
                      </div>
                    </Card>
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
