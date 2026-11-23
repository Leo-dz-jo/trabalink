import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/require-role";
import { ThemeProvider } from "@/components/theme-provider";
import { CustomCursor } from "@/components/custom-cursor";
import { AnimatedWordmark } from "@/components/brand/brand";
import { AppShell } from "@/components/layout/app-shell";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AppHome = lazy(() => import("./pages/app/AppHome.tsx"));
const Jobs = lazy(() => import("./pages/app/Jobs.tsx"));
const JobDetail = lazy(() => import("./pages/app/JobDetail.tsx"));
const Applications = lazy(() => import("./pages/app/Applications.tsx"));
const Profile = lazy(() => import("./pages/app/Profile.tsx"));
const Messages = lazy(() => import("./pages/app/Messages.tsx"));
const Interviews = lazy(() => import("./pages/app/Interviews.tsx"));
const ResumeStudio = lazy(() => import("./pages/app/ResumeStudio.tsx"));
const Conversation = lazy(() => import("./pages/app/Conversation.tsx"));
const AdminConsole = lazy(() => import("./pages/app/AdminConsole.tsx"));
const EmployerJobs = lazy(() => import("./pages/app/EmployerJobs.tsx"));
const JobForm = lazy(() => import("./pages/app/JobForm.tsx"));
const JobApplicants = lazy(() => import("./pages/app/JobApplicants.tsx"));
const EmployerPipeline = lazy(() => import("./pages/app/EmployerPipeline.tsx"));
const ApplicantDetail = lazy(() => import("./pages/app/ApplicantDetail.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <AnimatedWordmark className="text-3xl text-foreground" animate />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Hire on proof
      </span>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 break-words text-xs text-muted-foreground">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 max-h-40 overflow-auto rounded border border-border/60 p-2 text-left text-[10px] leading-4 text-muted-foreground/80">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ThemeProvider>
        <CustomCursor />
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<AuthPage redirectAfterAuth="/app" />} />
                <Route
                  path="/onboarding"
                  element={
                    <RequireAuth redirectImmediately>
                      <Onboarding />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app"
                  element={
                    <RequireAuth redirectImmediately title="Sign in to your workspace">
                      <RequireRole>
                        <AppShell />
                      </RequireRole>
                    </RequireAuth>
                  }
                >
                  <Route index element={<AppHome />} />
                  <Route path="jobs" element={<Jobs />} />
                  <Route path="jobs/:jobId" element={<JobDetail />} />
                  <Route path="applications" element={<Applications />} />
                  <Route path="interviews" element={<Interviews />} />
                  <Route path="resume" element={<ResumeStudio />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="messages/:conversationId" element={<Conversation />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="admin" element={<AdminConsole />} />
                  <Route path="admin/users" element={<AdminConsole />} />
                  <Route path="admin/jobs" element={<AdminConsole />} />
                  <Route
                    path="employer"
                    element={
                      <RequireRole role="employer">
                        <Outlet />
                      </RequireRole>
                    }
                  >
                    <Route path="jobs" element={<EmployerJobs />} />
                    <Route path="jobs/new" element={<JobForm />} />
                    <Route path="jobs/:jobId/edit" element={<JobForm />} />
                    <Route path="jobs/:jobId/applicants" element={<JobApplicants />} />
                    <Route path="pipeline" element={<EmployerPipeline />} />
                    <Route
                      path="applications/:applicationId"
                      element={<ApplicantDetail />}
                    />
                  </Route>
                </Route>
                <Route path="/dashboard" element={<Navigate to="/app" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </ConvexAuthProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
