import React, { Suspense, useEffect, lazy, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import api from "./api";

// Global alerts provider
import { AlertsProvider } from "./context/AlertsContext";
import { LoadingProvider } from "./context/LoadingContext";

// Server-verified auth hook + guard
function useServerAuth() {
  const [state, setState] = useState({ loading: true, authed: false });
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/v1/auth/me", { withCredentials: true })
      .then((res) => {
        if (!mounted) return;
        // server says we're authed; mirror to localStorage for compatibility
        try {
          localStorage.setItem("auth", "1");
        } catch {}
        setState({ loading: false, authed: true });
      })
      .catch(() => {
        if (!mounted) return;
        try {
          localStorage.removeItem("auth");
        } catch {}
        setState({ loading: false, authed: false });
      });
    return () => (mounted = false);
  }, []);
  return state;
}

function ProtectedRoute({ children }) {
  const { loading, authed } = useServerAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;
  if (!authed) {
    const wanted = (location.pathname || "/") + (location.search || "");
    if (!wanted.startsWith("/login")) {
      sessionStorage.setItem("postLoginRedirect", wanted);
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}

// EAGER imports (only critical for initial load)
import Login from "./components/Login.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import AppLayout from "./components/AppLayout.jsx";

// LAZY imports (code-split to reduce main bundle size)
const Home = lazy(() => import("./components/Home.jsx"));
const Register = lazy(() => import("./components/Register.jsx"));
const AddEmployee = lazy(() => import("./components/AddEmployee.jsx"));
const Reports = lazy(() => import("./components/Reports.jsx"));
const ChangePassword = lazy(() => import("./components/ChangePassword.jsx"));
const AdminCreateUser = lazy(() => import("./components/AdminCreateUser.jsx"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./components/ResetPassword.jsx"));
const GanttView = lazy(() => import("./components/GanttView.jsx"));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy.jsx"));
const TermsOfUse = lazy(() => import("./components/TermsOfUse.jsx"));
const LeasedLabor = lazy(() => import("./components/LeasedLabor.jsx"));
const Alerts = lazy(() => import("./pages/Alerts"));
const AlertDetails = lazy(() => import("./pages/AlertDetails"));
const AddTransfer = lazy(() => import("./components/AddTransfer.jsx"));
const EmployeeDetails = lazy(() => import("./components/EmployeeDetails.jsx"));
const EditEmployee = lazy(() => import("./components/EditEmployee.jsx"));
const InactiveOnLeave = lazy(() => import("./components/InactiveOnLeave.jsx"));
const Terminated = lazy(() => import("./components/Terminated.jsx"));
const Transfers = lazy(() => import("./components/Transfers.jsx"));
const NewHires = lazy(() => import("./components/NewHire.jsx"));
const Mandown = lazy(() => import("./components/Mandown.jsx"));
const TimecardsImport = lazy(() => import("./pages/TimecardsImport"));
const KPIDashboard = lazy(() => import("./components/KPIDashboard.jsx"));
const Timecards = lazy(() => import("./pages/Timecards.jsx"));
const OrphanPunches = lazy(() => import("./pages/OrphanPunches.jsx"));

export default function App() {
  useEffect(() => {
    // global boot hooks if needed later
  }, []);

  return (
    <AlertsProvider>
      <LoadingProvider>
        <div className="app-shell">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route
                  path="/ping"
                  element={<div style={{ padding: 24 }}>OK</div>}
                />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/gantt"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <GanttView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route
                  path="/admin/timecards"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <TimecardsImport />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orphan-punches"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <OrphanPunches />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Authenticated */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Home />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee-details/:employeeid"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <EmployeeDetails />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee/new"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AddEmployee />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee/:id/edit"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <EditEmployee />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <KPIDashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timecards"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Timecards />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Reports />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Transfers />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfers/new"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AddTransfer />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/password"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ChangePassword />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/create-user"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AdminCreateUser />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leased-labor"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <LeasedLabor />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inactive-on-leave"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <InactiveOnLeave />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terminated"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Terminated />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new-hires"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <NewHires />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mandown"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Mandown />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Alerts (leave public if you intend deep-linking) */}
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/alerts/:id" element={<AlertDetails />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </LoadingProvider>
    </AlertsProvider>
  );
}
