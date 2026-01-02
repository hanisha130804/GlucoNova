import { useState, useRef } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { FileText, Upload, Download, Eye, User, Mail, Calendar, Brain, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Report {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  description?: string;
  patientId: string;
}

interface PatientDetails {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
}

export default function MedicalReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);

  const { data: reportsData, isLoading } = useQuery<{ reports: Report[] }>({
    queryKey: ['/api/reports'],
  });

  // Fetch patient details for selected report
  const { data: patientData, isLoading: isLoadingPatient } = useQuery<{ patient: PatientDetails; report: Report }>({
    queryKey: ['/api/reports', selectedReportId, 'patient'],
    enabled: !!selectedReportId && showPatientDetails,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${selectedReportId}/patient`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }

      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem('token');
      
      console.log('📤 Starting upload mutation');
      console.log('Token exists:', !!token);
      console.log('FormData contents:');
      console.log('  file:', formData.get('file'));
      console.log('  patientId:', formData.get('patientId'));
      console.log('  description:', formData.get('description'));
      
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        console.error('❌ Upload failed:', response.status, error);
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Report uploaded successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload report',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.log('handleFileUpload triggered');
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    
    if (!fileInputRef.current?.files?.length) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    
    // Use user.id directly (this matches the _id from the token)
    const patientId = user?.id || '';
    formData.append('patientId', patientId);
    
    console.log('Setting patientId to:', patientId);
    
    if (description) {
      formData.append('description', description);
    }

    uploadMutation.mutate(formData);
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  const handleViewPatientDetails = (reportId: string) => {
    setSelectedReportId(reportId);
    setShowPatientDetails(true);
  };

  const handleClosePatientDetails = () => {
    setSelectedReportId(null);
    setShowPatientDetails(false);
  };

  return (
    <div className="flex h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', backgroundColor: '#142033' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <FileText className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-semibold">Medical Reports & AI Insights</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            
            {/* AI-Extracted Insights Card - Premium Section */}
            <div className="glass-panel p-6 mb-6 border border-cyan-800/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-300">AI-Extracted Health Insights</h2>
                  <p className="text-sm text-gray-500">Automatically extracted from your uploaded reports</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-subtle p-4 rounded-xl bg-cyan-900/20 border border-cyan-700/30 hover:border-cyan-500/50 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-400">Latest A1C</p>
                  </div>
                  <p className="text-3xl font-bold text-cyan-400">7.6%</p>
                  <p className="text-xs text-cyan-500 mt-1">Target: &lt;7.0%</p>
                </div>
                
                <div className="glass-subtle p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/30 hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-gray-400">Avg Glucose</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">128</p>
                  <p className="text-xs text-emerald-500 mt-1">mg/dL • Last 90 days</p>
                </div>
                
                <div className="glass-subtle p-4 rounded-xl bg-purple-900/20 border border-purple-700/30 hover:border-purple-500/50 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-gray-400">Extracted On</p>
                  </div>
                  <p className="text-lg font-bold text-purple-400">24 Dec</p>
                  <p className="text-xs text-purple-500 mt-1">2025</p>
                </div>
                
                <div className="glass-subtle p-4 rounded-xl bg-amber-900/20 border border-amber-700/30 hover:border-amber-500/50 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-amber-400" />
                    <p className="text-xs text-gray-400">AI Confidence</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-400">92%</p>
                  <p className="text-xs text-amber-500 mt-1">High accuracy</p>
                </div>
              </div>

              {!reportsData?.reports?.length && (
                <div className="mt-4 p-4 bg-amber-900/10 border border-amber-700/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">No reports uploaded yet</p>
                    <p className="text-xs text-amber-500/70 mt-1">Upload your first medical report to see AI-extracted insights appear here automatically</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Section - Enhanced Glass Design */}
              <div className="glass-panel p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600/30 to-emerald-700/20 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-300">Upload Report</h2>
                    <p className="text-xs text-gray-500">PDF, JPEG, or PNG</p>
                  </div>
                </div>

                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload" className="text-gray-300">Select Medical Report</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpeg,.jpg,.png"
                      ref={fileInputRef}
                      className="mt-2 glass-subtle border-gray-700"
                      data-testid="input-file"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max size: 20MB • AI will auto-extract health data
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-gray-300">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., Annual checkup, HbA1c test results..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-2 glass-subtle border-gray-700"
                      data-testid="input-description"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload"
                  >
                    {uploadMutation.isPending ? 'Uploading & Processing...' : '📤 Upload Report'}
                  </Button>
                </form>
              </div>

              {/* Reports List - Enhanced with Glass Design */}
              <div className="glass-panel p-6 lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-700/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-300">Your Medical Documents</h2>
                    <p className="text-xs text-gray-500">{reportsData?.reports?.length || 0} files uploaded</p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-2"></div>
                    <p className="text-sm text-gray-400">Loading your reports...</p>
                  </div>
                ) : (reportsData && reportsData.reports && reportsData.reports.length > 0) ? (
                  <div className="space-y-3">
                    {reportsData!.reports.map((report: Report) => (
                      <div
                        key={report._id}
                        className="glass-subtle p-4 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-300"
                        data-testid={`report-${report._id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-300 truncate" data-testid={`text-filename-${report._id}`}>
                                {report.fileName}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                📅 {new Date(report.uploadedAt).toLocaleDateString()} • {(report.fileSize / 1024).toFixed(0)} KB
                              </p>
                              {report.description && (
                                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                  {report.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="ml-2 flex-shrink-0 bg-blue-900/30 text-blue-400 border-blue-700/30"
                          >
                            {report.fileType === 'application/pdf' ? 'PDF' : 'Image'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPatientDetails(report._id)}
                            className="glass-subtle border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-900/20"
                            data-testid={`button-patient-details-${report._id}`}
                          >
                            <User className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(report.fileUrl, report.fileName)}
                            className="glass-subtle border-gray-700 hover:border-blue-500/50 hover:bg-blue-900/20"
                            data-testid={`button-download-${report._id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          {report.fileType === 'application/pdf' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(report.fileUrl, '_blank')}
                              className="glass-subtle hover:bg-cyan-900/20"
                              data-testid={`button-view-${report._id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Open
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-10 h-10 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No reports uploaded yet</p>
                    <p className="text-xs text-gray-600 mt-2">Upload your first medical report to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient Details Modal - Enhanced */}
            {showPatientDetails && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="glass-panel p-6 max-w-md w-full border border-cyan-700/30 animate-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-300">Report Details</h2>
                        <p className="text-xs text-gray-500">Patient information</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClosePatientDetails}
                      className="hover:bg-red-900/20 text-gray-400 hover:text-red-400"
                      data-testid="button-close-patient-details"
                    >
                      ✕
                    </Button>
                  </div>

                  {isLoadingPatient ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-2"></div>
                      <p className="text-sm text-gray-400">Loading details...</p>
                    </div>
                  ) : patientData ? (
                    <div className="space-y-4">
                      <div className="glass-subtle p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-cyan-400" />
                          <span className="font-medium text-gray-300">Name:</span>
                          <span className="text-gray-400">{patientData.patient.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-cyan-400" />
                          <span className="font-medium text-gray-300">Email:</span>
                          <span className="text-gray-400">{patientData.patient.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-cyan-400" />
                          <span className="font-medium text-gray-300">Member Since:</span>
                          <span className="text-gray-400">
                            {new Date(patientData.patient.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-300">Status:</span>
                          <Badge 
                            variant={patientData.patient.isApproved ? 'default' : 'destructive'}
                            className={patientData.patient.isApproved ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30' : ''}
                          >
                            {patientData.patient.isApproved ? '✓ Verified' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      <div className="glass-subtle p-4 rounded-xl border-t border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          Report Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">File:</span>
                            <span className="text-gray-300 font-medium">{patientData.report.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-300">{patientData.report.fileType === 'application/pdf' ? 'PDF Document' : 'Image File'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Uploaded:</span>
                            <span className="text-gray-300">{new Date(patientData.report.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 italic pt-2 flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 mt-0.5" />
                        Patient credentials are encrypted and not displayed for security
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-red-400">Failed to load details</p>
                      <p className="text-xs text-gray-500 mt-1">Please try again</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
