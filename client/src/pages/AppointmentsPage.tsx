import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';

export default function AppointmentsPage() {
  const appointments = [
    { id: 1, doctor: 'Dr. Sarah Smith', specialty: 'Endocrinologist', date: '2024-11-25', time: '10:00 AM', type: 'In-Person', location: 'Medical Center, Room 301' },
    { id: 2, doctor: 'Dr. James Wilson', specialty: 'Nutritionist', date: '2024-11-28', time: '2:30 PM', type: 'Video Call', location: 'Online' },
    { id: 3, doctor: 'Dr. Emily Chen', specialty: 'Primary Care', date: '2024-12-02', time: '9:00 AM', type: 'In-Person', location: 'Clinic Building, Floor 2' },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Appointments</h2>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule New
          </Button>
        </header>
        
        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">Your Appointments</h1>
            <p className="text-muted-foreground">Manage your upcoming healthcare appointments</p>
          </div>

          <div className="space-y-4">
            {appointments.map((apt) => (
              <Card key={apt.id} className="hover:border-primary/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{apt.doctor}</h3>
                          <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 ml-15">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{apt.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{apt.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {apt.type === 'Video Call' ? (
                            <Video className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{apt.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {apt.type === 'Video Call' && (
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4 mr-2" />
                          Join Call
                        </Button>
                      )}
                      <Button variant="outline" size="sm">Reschedule</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">Cancel</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
