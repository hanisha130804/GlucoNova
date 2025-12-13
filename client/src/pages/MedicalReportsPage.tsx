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
import { FileText, Upload, Download, Eye, User, Mail, Calendar } from 'lucide-react';
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
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Upload className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Medical Reports</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">Medical Reports</h1>
              <p className="text-muted-foreground">Upload and manage your medical documents</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Upload Report</h2>
                </div>

                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Select File (PDF, JPEG, PNG)</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpeg,.jpg,.png"
                      ref={fileInputRef}
                      className="mt-2"
                      data-testid="input-file"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max file size: 20MB
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Add a description for this report..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-2"
                      data-testid="input-description"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Report'}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Your Reports</h2>
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading reports...</p>
                ) : (reportsData && reportsData.reports && reportsData.reports.length > 0) ? (
                  <div className="space-y-3">
                    {reportsData!.reports.map((report: Report) => (
                      <div
                        key={report._id}
                        className="p-4 rounded-lg bg-secondary/50 space-y-3"
                        data-testid={`report-${report._id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold" data-testid={`text-filename-${report._id}`}>
                              {report.fileName}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                            </p>
                            {report.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {report.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {report.fileType === 'application/pdf' ? 'PDF' : 'Image'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Size: {(report.fileSize / 1024).toFixed(2)} KB</span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPatientDetails(report._id)}
                            data-testid={`button-patient-details-${report._id}`}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Patient Info
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(report.fileUrl, report.fileName)}
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
                              data-testid={`button-view-${report._id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reports uploaded yet. Upload your first medical report!
                  </p>
                )}
              </Card>
            </div>

            {/* Patient Details Modal */}
            {showPatientDetails && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold">Patient Details</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClosePatientDetails}
                      data-testid="button-close-patient-details"
                    >
                      ×
                    </Button>
                  </div>

                  {isLoadingPatient ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading patient details...</p>
                  ) : patientData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Name:</span>
                          <span className="text-muted-foreground">{patientData.patient.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Email:</span>
                          <span className="text-muted-foreground">{patientData.patient.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant={patientData.patient.role === 'patient' ? 'default' : 'secondary'}>
                            {patientData.patient.role.charAt(0).toUpperCase() + patientData.patient.role.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Member Since:</span>
                          <span className="text-muted-foreground">
                            {new Date(patientData.patient.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Account Status:</span>
                          <Badge variant={patientData.patient.isApproved ? 'default' : 'destructive'}>
                            {patientData.patient.isApproved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-semibold mb-2">Report Information</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><span className="font-medium">File:</span> {patientData.report.fileName}</p>
                          <p><span className="font-medium">Type:</span> {patientData.report.fileType}</p>
                          <p><span className="font-medium">Uploaded:</span> {new Date(patientData.report.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground italic pt-4 border-t border-border">
                        Note: For security reasons, patient credentials (passwords) are not displayed.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Failed to load patient details. Please try again.
                    </p>
                  )}
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
