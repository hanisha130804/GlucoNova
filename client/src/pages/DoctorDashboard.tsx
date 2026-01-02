import { useState, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Users, BarChart3, TrendingUp, AlertCircle, Eye, 
  Activity, BellRing, TrendingDown, AlertTriangle, ClipboardList,
  ChevronRight, ArrowUp, ArrowDown, Zap, Brain, Target, Pill
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

interface PatientData {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: string;
  healthMetrics?: {
    avgGlucose?: number;
    lastGlucose?: number;
    lastA1c?: number;
    timeInRange?: number;
    recentReadings?: number;
  };
  riskLevel?: 'high' | 'medium' | 'stable';
}

interface AlertData {
  id: string;
  patientId: string;
  patientName: string;
  type: 'hyper' | 'hypo' | 'adherence';
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
}

export default function DoctorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [patientHealthData, setPatientHealthData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.getPatients();
      const enrichedPatients = await Promise.all(
        response.patients.map(async (patient: any) => {
          try {
            const healthData = await apiRequest(`/api/health-data?userId=${patient.id}`);
            const data = (healthData as any).data || [];
            
            const avgGlucose = data.length > 0
              ? Math.round(data.reduce((sum: number, item: any) => sum + item.glucose, 0) / data.length)
              : 0;
            
            const timeInRange = data.length > 0
              ? Math.round((data.filter((item: any) => item.glucose >= 70 && item.glucose <= 180).length / data.length) * 100)
              : 0;

            // Determine risk level based on metrics
            let riskLevel: 'high' | 'medium' | 'stable' = 'stable';
            if (avgGlucose > 200 || avgGlucose < 80 || timeInRange < 50) {
              riskLevel = 'high';
            } else if (avgGlucose > 160 || timeInRange < 70) {
              riskLevel = 'medium';
            }

            return {
              ...patient,
              age: Math.floor(Math.random() * 40) + 25, // Mock age
              riskLevel,
              healthMetrics: {
                avgGlucose,
                lastGlucose: data.length > 0 ? data[0].glucose : 0,
                lastA1c: 7.2 + (Math.random() * 2), // Mock A1c
                timeInRange,
                recentReadings: data.length,
              },
            };
          } catch (error) {
            return patient;
          }
        })
      );
      setPatients(enrichedPatients);
    } catch (error: any) {
      toast({
        title: t('admin.messages.loadUsersFailed'),
        description: error.message || t('admin.messages.refreshPage'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (patientId: string) => {
    try {
      setLoadingPatientData(true);
      const response = await apiRequest(`/api/health-data?userId=${patientId}`);
      setPatientHealthData((response as any).data || []);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setLoadingPatientData(false);
    }
  };

  const handlePatientSelect = async (patient: PatientData) => {
    setSelectedPatient(patient);
    await fetchPatientData(patient.id);
  };

  // Calculate statistics
  const highRiskPatients = patients.filter(p => p.riskLevel === 'high').length;
  const totalAlerts = Math.floor(Math.random() * 5) + 2;
  const pendingReports = Math.floor(Math.random() * 3) + 2;
  
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = patientHealthData
    .slice(0, 20)
    .reverse()
    .map((item: any) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      glucose: item.glucose,
    }));

  return (
    <div className="flex h-screen w-full relative overflow-hidden animate-in fade-in duration-300" style={{ backgroundColor: '#0b111b' }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', backgroundColor: '#0f172a' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-semibold">Clinical Dashboard</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">{t('doctor.welcome', { name: user?.name || t('common.doctor') })}</h1>
              <p className="text-muted-foreground">Clinical overview and patient management</p>
            </div>

            {/* SECTION A: Today's Clinical Overview - 4 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Patients Card */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(34,211,238,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16,185,129,0.2)',
                boxShadow: '0 0 20px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total Patients Assigned</p>
                      <p className="text-4xl font-bold text-emerald-400">{patients.length}</p>
                      <p className="text-xs text-muted-foreground mt-2">Active Patients</p>
                    </div>
                    <Users className="w-8 h-8 text-emerald-400 opacity-40" />
                  </div>
                </CardContent>
              </Card>

              {/* High-Risk Patients Card */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(251,146,60,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.2)',
                boxShadow: '0 0 20px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">High-Risk Patients</p>
                      <p className="text-4xl font-bold text-red-400">{highRiskPatients}</p>
                      <p className="text-xs text-muted-foreground mt-2">Requires attention</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400 opacity-40" />
                  </div>
                </CardContent>
              </Card>

              {/* Critical Alerts Card */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(251,191,36,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(251,146,60,0.2)',
                boxShadow: '0 0 20px rgba(251,146,60,0.15), 0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Critical Alerts</p>
                      <p className="text-4xl font-bold text-orange-400">{totalAlerts}</p>
                      <div className="flex gap-1 mt-2">
                        <Badge style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Hyper</Badge>
                        <Badge style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>Hypo</Badge>
                      </div>
                    </div>
                    <BellRing className="w-8 h-8 text-orange-400 opacity-40" />
                  </div>
                </CardContent>
              </Card>

              {/* Reports Awaiting Card */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(34,211,238,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(59,130,246,0.2)',
                boxShadow: '0 0 20px rgba(59,130,246,0.15), 0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Reports Awaiting</p>
                      <p className="text-4xl font-bold text-cyan-400">{pendingReports}</p>
                      <p className="text-xs text-muted-foreground mt-2">Uploaded by patients</p>
                    </div>
                    <ClipboardList className="w-8 h-8 text-cyan-400 opacity-40" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECTION B: High-Risk Patients Strip */}
            {patients.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  High-Risk Patients
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {patients.filter(p => p.riskLevel === 'high').map(patient => (
                    <Card key={patient.id} className="relative overflow-hidden flex-shrink-0" style={{
                      width: '280px',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      boxShadow: '0 0 15px rgba(239,68,68,0.1), 0 4px 8px rgba(0,0,0,0.3)'
                    }}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{patient.name}</h3>
                            <p className="text-xs text-muted-foreground">{patient.age} years old</p>
                          </div>
                          <Badge style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>🔴 High</Badge>
                        </div>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">A1c</span>
                            <span className="font-medium text-red-400">{patient.healthMetrics?.lastA1c?.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Glucose</span>
                            <span className="font-medium">{patient.healthMetrics?.lastGlucose || '--'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TIR</span>
                            <span className="font-medium">{patient.healthMetrics?.timeInRange || '--'}%</span>
                          </div>
                        </div>
                        <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => handlePatientSelect(patient)}>
                          View Patient
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION C: Clinical Alerts Preview - 3 Alert Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Hyperglycemia Alerts */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.2)' }}>
                      <ArrowUp className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Hyperglycemia Alerts</h3>
                      <p className="text-2xl font-bold text-red-400 mb-2">2</p>
                      <p className="text-xs text-muted-foreground mb-3">Patients with elevated glucose</p>
                      <Button size="sm" variant="ghost" className="w-full text-xs h-8">
                        View All <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hypoglycemia Alerts */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(251,191,36,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.2)' }}>
                      <ArrowDown className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Hypoglycemia Alerts</h3>
                      <p className="text-2xl font-bold text-yellow-400 mb-2">1</p>
                      <p className="text-xs text-muted-foreground mb-3">Patients with low glucose</p>
                      <Button size="sm" variant="ghost" className="w-full text-xs h-8">
                        View All <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Adherence Alerts */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(59,130,246,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)' }}>
                      <Pill className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Adherence Alerts</h3>
                      <p className="text-2xl font-bold text-blue-400 mb-2">3</p>
                      <p className="text-xs text-muted-foreground mb-3">Missed logs & medications</p>
                      <Button size="sm" variant="ghost" className="w-full text-xs h-8">
                        View All <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECTION D: AI Clinical Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* A1c Direction Predictor */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(16,185,129,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(34,211,238,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    A1c Direction
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">Likely to increase slightly in next 3 months</p>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: '65%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Confidence: 65%</p>
                </CardContent>
              </Card>

              {/* Hyper/Hypo Risk Score */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(239,68,68,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(251,146,60,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    Risk Score
                  </h3>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Hyper Risk</span>
                      <span className="text-sm font-medium text-red-400">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Hypo Risk</span>
                      <span className="text-sm font-medium text-yellow-400">4%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Based on 30-day average</p>
                </CardContent>
              </Card>

              {/* Pattern Detection */}
              <Card className="relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(34,211,238,0.1) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Pattern Detection
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="text-xs text-muted-foreground">✓ Morning highs on 5/7 days</li>
                    <li className="text-xs text-muted-foreground">✓ Stable evenings pattern</li>
                    <li className="text-xs text-muted-foreground">⚠ Low insulin adherence</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
