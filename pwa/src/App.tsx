import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import Dashboard from "@/pages/Dashboard";
import Compliance from "@/pages/Compliance";
import DroneFleet from "@/pages/DroneFleet";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import NewJob from "@/pages/NewJob";
import Pilots from "@/pages/Pilots";
import Slots from "@/pages/Slots";
import AuditLog from "@/pages/AuditLog";
import Alerts from "@/pages/Alerts";
import Settings from "@/pages/Settings";
import More from "@/pages/More";
import Dpdp from "@/pages/Dpdp";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* All other routes require auth */}
      <Route
        element={
          <AuthGate>
            <AppShell />
          </AuthGate>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/new" element={<NewJob />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/pilots" element={<Pilots />} />
        <Route path="/fleet" element={<DroneFleet />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dpdp" element={<Dpdp />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
