import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { FolderOpen, FileText, Upload, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

export default function ReportsDocumentsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('reports');

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['/api/reports'],
  });

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <FolderOpen className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('reports.title')}</h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('reports.subtitle')}</h1>
              <p className="text-muted-foreground">{t('reports.description')}</p>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('reports')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'reports' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'reports' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'reports' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                {t('reports.myReports')}
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'upload' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'upload' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'upload' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                {t('reports.uploadNew')}
              </button>
              <button
                onClick={() => setActiveTab('trends')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'trends' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'trends' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'trends' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                {t('reports.trends')}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('reports.loading')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'reports' && (
                  <>
                    {(reportsData as any)?.reports?.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(reportsData as any).reports.map((report: any) => (
                          <Card key={report._id} className="p-6 glass-card">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/20">
                                  <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-foreground">{report.fileName}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(report.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {report.description && (
                                <p className="text-sm text-muted-foreground">{report.description}</p>
                              )}
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span>{report.fileType}</span>
                                <span>•</span>
                                <span>{(report.fileSize / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <Button className="w-full mt-4 bg-primary/20 text-primary hover:bg-primary/30">
                              {t('reports.viewDetails')}
                            </Button>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 glass-card text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium mb-2">{t('reports.noReportsYet')}</p>
                        <p className="text-muted-foreground mb-4">{t('reports.uploadFirst')}</p>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-medium inline-block"
                        >
                          {t('reports.uploadReport')}
                        </button>
                      </Card>
                    )}
                  </>
                )}

                {activeTab === 'upload' && (
                  <Link href="/documents">
                    <Card className="p-8 glass-card">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('reports.uploadMedicalReport')}</h3>
                        <p className="text-muted-foreground mb-6">
                          {t('reports.goToDocuments')}
                        </p>
                        <Button className="bg-primary hover:bg-primary/90">
                          {t('reports.goToDocumentsPage')}
                        </Button>
                      </div>
                    </Card>
                  </Link>
                )}

                {activeTab === 'trends' && (
                  <Card className="p-8 glass-card">
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="text-center p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground mb-1">{t('reports.avgA1C')}</p>
                        <p className="text-2xl font-bold text-primary">--</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('reports.basedOnReports')}</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground mb-1">{t('reports.bmiTrend')}</p>
                        <p className="text-2xl font-bold text-primary">--</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('reports.basedOnReports')}</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground mb-1">{t('reports.totalReports')}</p>
                        <p className="text-2xl font-bold text-primary">{(reportsData as any)?.reports?.length || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('reports.uploaded')}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground font-medium mb-1">{t('reports.trendAnalysisComingSoon')}</p>
                      <p className="text-muted-foreground text-sm">{t('reports.uploadMoreForTrends')}</p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
