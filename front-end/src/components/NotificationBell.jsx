import React from "react";
import { useAlerts } from "../context/AlertsContext";
import styles from "../stylesheets/AlertsDrawer.module.css";

export default function NotificationBell({ onOpen }) {
  const { count } = useAlerts();

  return (
    <button
      type="button"
      className={styles.bellBtn}
      aria-label={count ? `Open alerts (${count})` : "Open alerts"}
      title="Alerts"
      onClick={onOpen}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"
        />
      </svg>
      {count > 0 && <span className={styles.bellBadge}>{count}</span>}
    </button>
  );
}
