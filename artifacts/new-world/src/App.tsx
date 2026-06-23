import { useState, useEffect, useCallback } from "react";
import Home from "./pages/Home";
import MaintenancePage from "./components/MaintenancePage";
import AdminPanel from "./components/AdminPanel";

type MaintenanceState = {
  enabled: boolean;
  message: string;
  eta: string;
};

export default function App() {
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [checked, setChecked] = useState(false);

  const checkMaintenance = useCallback(() => {
    fetch("/api/maintenance")
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => {
        if (data && typeof data === "object") setMaintenance(data as MaintenanceState);
        setChecked(true);
      });
  }, []);

  useEffect(() => { checkMaintenance(); }, [checkMaintenance]);

  if (!checked) return null;

  if (maintenance?.enabled) {
    return (
      <>
        <MaintenancePage message={maintenance.message} eta={maintenance.eta} />
        <AdminPanel onRefresh={checkMaintenance} />
      </>
    );
  }

  return <Home />;
}
