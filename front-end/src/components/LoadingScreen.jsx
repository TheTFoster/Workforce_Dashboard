import React from "react";
import { useLocation } from "react-router-dom";
import styles from "../stylesheets/LoadingScreen.module.css";

export default function LoadingScreen() {
  const { pathname } = useLocation();

  let headline = "Loading…";
  if (pathname?.startsWith("/employee-details")) headline = "Loading employee details…";
  if (pathname === "/home") headline = "Loading dashboard…";

  return (
    <div className={styles.fullscreen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <div className={styles.spinner} />
        <h2 className={styles.title}>{headline}</h2>
        <p className={styles.subtle}>Please wait a moment</p>
      </div>
    </div>
  );
}
