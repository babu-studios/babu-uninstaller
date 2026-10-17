import { useCallback, useEffect, useState } from "react";
import type { AppInfo, AppScanResult } from "../../shared/contracts";

export function useInventory() {
  const [result, setResult] = useState<AppScanResult>({ apps: [], inaccessible: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await window.babu.listApps());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not scan applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const replaceApp = useCallback((app: AppInfo) => {
    setResult((current) => ({
      ...current,
      apps: current.apps.map((item) => item.path === app.path ? app : item)
    }));
  }, []);

  return { ...result, loading, error, refresh, replaceApp };
}
