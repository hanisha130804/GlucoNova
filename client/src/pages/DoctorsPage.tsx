import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Phone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DoctorsPage() {
  const { t } = useTranslation();
  const doctors = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Endocrinologist',
      phone: '+1 (555) 123-4567',
      email: 'sarah.johnson@hospital.com',
      location: 'City Medical Center',
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Diabetes Specialist',
      phone: '+1 (555) 987-6543',
      email: 'michael.chen@clinic.com',
      location: 'Downtown Health Clinic',
    },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('doctor.patientManagement')}</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('doctor.patientManagement')}</h1>
              <p className="text-muted-foreground">{t('doctor.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary" />
                      {doctor.name}
                    </CardTitle>
                    <CardDescription>{doctor.specialty}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{doctor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{doctor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{doctor.location}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
