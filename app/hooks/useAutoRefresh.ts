import { useEffect, useRef } from "react";

type RefreshCallback = () => void | Promise<void>;

export const AUTO_REFRESH_INTERVAL_MS = 5000;

/**
 * Refresh visible client data while the user keeps a page open.
 * Polling covers updates made in other browsers; focus/visibility refreshes
 * catch changes immediately when a user returns to a tab.
 */
export function useAutoRefresh(
  refresh: RefreshCallback,
  enabled = true,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    let running = false;

    const refreshWhenVisible = () => {
      if (running || document.visibilityState === "hidden") return;

      running = true;
      void Promise.resolve()
        .then(() => refreshRef.current())
        .catch(() => undefined)
        .finally(() => {
          running = false;
        });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshWhenVisible();
      }
    };

    const intervalId = window.setInterval(refreshWhenVisible, intervalMs);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
