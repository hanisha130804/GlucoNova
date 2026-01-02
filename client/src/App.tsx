import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { lazy, Suspense } from "react";
import '@/i18n/config'; // Initialize i18n

// Eager-loaded auth pages (always needed)
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import RoleSelectionPage from "@/pages/RoleSelectionPage";
import NotFound from "@/pages/not-found";

// Lazy-loaded dashboard pages (loaded on demand based on role)
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

// Lazy-loaded feature pages (loaded when accessed)
const HealthDataPage = lazy(() => import("@/pages/HealthDataPage"));
const MealLoggingPage = lazy(() => import("@/pages/MealLoggingPage"));
const MedicalReportsPage = lazy(() => import("@/pages/MedicalReportsPage"));
const DoctorsPage = lazy(() => import("@/pages/DoctorsPage"));
const GlucosePage = lazy(() => import("@/pages/GlucosePage"));
const InsulinPage = lazy(() => import("@/pages/InsulinPage"));
const MedicationsPage = lazy(() => import("@/pages/MedicationsPage"));
const VoiceAIPage = lazy(() => import("@/pages/VoiceAIPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const DoctorMessagesPage = lazy(() => import("@/pages/DoctorMessagesPage"));
const AIInsightsPage = lazy(() => import("@/pages/AIInsightsPage"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const AppointmentsPage = lazy(() => import("@/pages/AppointmentsPage"));
const DocumentsOCRPage = lazy(() => import("@/pages/DocumentsOCRPage"));

// Newly merged pages (Redesigned Sidebar Navigation)
const GlucoseInsulinPage = lazy(() => import("@/pages/GlucoseInsulinPage"));
const AIFoodLogPage = lazy(() => import("@/pages/AIFoodLogPage"));
const SuggestionsActivityPage = lazy(() => import("@/pages/SuggestionsActivityPage"));
const FoodActivityPage = lazy(() => import("@/pages/FoodActivityPage"));
const ReportsDocumentsPage = lazy(() => import("@/pages/ReportsDocumentsPage"));
const CareTeamPage = lazy(() => import("@/pages/CareTeamPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

import { ReactNode, Component } from "react";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error);
    console.error('ErrorBoundary error info:', errorInfo);
    console.error('Component stack:', errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'linear-gradient(to bottom right, rgb(23, 23, 23), rgb(24, 24, 27), rgb(10, 10, 10))',
          color: 'white',
          padding: '40px',
          fontFamily: 'monospace',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>GlucoNova - Error</h1>
            <p style={{ color: '#ff6b6b', marginBottom: '20px' }}>An error occurred in the application</p>
            <details style={{ textAlign: 'left', marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', color: '#2dd4bf' }}>Error Details</summary>
              <pre style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '10px',
                borderRadius: '5px',
                overflowX: 'auto',
                marginTop: '10px'
              }}>{this.state.error?.stack || String(this.state.error)}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple test component to verify React is working
function TestComponent() {
  console.log('TestComponent rendering...');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">GlucoNova Test Page</h1>
        <p className="text-xl text-emerald-400">If you can see this, React is working!</p>
      </div>
    </div>
  );
}

// Loading fallback component for lazy-loaded pages
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-emerald-400 font-medium">Loading page...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRoles, requireApproval = true, ...rest }: any) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

// Dashboard route handler with role-based lazy loading
function DashboardRouteHandler(params: any) {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Lazy load the appropriate dashboard based on role
  if (user.role === 'doctor') {
    return <DoctorDashboard {...params} />;
  }
  if (user.role === 'admin') {
    return <AdminDashboard {...params} />;
  }
  return <DashboardPage {...params} />;
}

function Router() {
  console.log('Router component rendering...');
  const { user } = useAuth();

  return (
    <Switch>
      {/* Test route - temporary for debugging */}
      <Route path="/test" component={TestComponent} />
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/role-selection" component={RoleSelectionPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardRouteHandler {...params} />
          </Suspense>
        )}
      </Route>
      <Route path="/health-data">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={HealthDataPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/meals">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={MealLoggingPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/reports">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={MedicalReportsPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/doctors">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={DoctorsPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/glucose">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={GlucosePage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/insulin">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={InsulinPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/medications">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={MedicationsPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/voice">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={VoiceAIPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/messages">
        {(params) => {
          const { user } = useAuth();
          const MessageComponent = user?.role === 'doctor' ? DoctorMessagesPage : MessagesPage;
          return (
            <Suspense fallback={<LoadingFallback />}>
              <ProtectedRoute 
                component={MessageComponent}
                allowedRoles={['patient', 'doctor']}
                {...params}
              />
            </Suspense>
          );
        }}
      </Route>
      <Route path="/ai-insights">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={AIInsightsPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/activity">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={ActivityPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/patients">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={DoctorsPage}
              allowedRoles={['doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/alerts">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={AlertsPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/appointments">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={AppointmentsPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/documents">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={DocumentsOCRPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>

      {/* New Merged Routes (Redesigned Sidebar) */}
      <Route path="/meal-tracking">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={AIFoodLogPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/glucose-insulin">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={GlucoseInsulinPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/ai-food-log">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={AIFoodLogPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/suggestions-activity">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={SuggestionsActivityPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/food-activity">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={FoodActivityPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/reports-documents">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={ReportsDocumentsPage}
              allowedRoles={['patient', 'doctor']}
              {...params}
            />
          </Suspense>
        )}
      </Route>
      <Route path="/care-team">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={CareTeamPage}
              allowedRoles={['patient']}
              {...params}
            />
          </Suspense>
        )}
      </Route>

      {/* Settings Route - Available for all roles */}
      <Route path="/settings">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute 
              component={SettingsPage}
              allowedRoles={['patient', 'doctor', 'admin']}
              {...params}
            />
          </Suspense>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log('App component rendering...');
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;