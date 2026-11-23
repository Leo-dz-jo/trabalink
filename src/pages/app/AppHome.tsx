import { Navigate } from "react-router";
import { ScreenLoader } from "@/components/shared/page";
import { useViewer } from "@/hooks/use-viewer";
import { ApplicantDashboard } from "./ApplicantDashboard";
import { EmployerDashboard } from "./EmployerDashboard";

export default function AppHome() {
  const { viewer } = useViewer();
  if (viewer === undefined) return <ScreenLoader label="Opening your workspace" />;
  if (viewer?.user.role === "admin") return <Navigate to="/app/admin" replace />;
  if (viewer?.user.role === "employer") return <EmployerDashboard />;
  return <ApplicantDashboard />;
}
