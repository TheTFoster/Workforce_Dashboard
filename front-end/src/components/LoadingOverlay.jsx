import React from "react";
import styles from "../stylesheets/LoadingOverlay.module.css";
import { useLoading } from "../context/LoadingContext";

// If you prefer a GIF, place it at front-end/src/assets/loading.gif
// import loadingGif from "../assets/loading.gif";

export default function LoadingOverlay() {
  const { isLoading, message } = useLoading();
  if (!isLoading) return null;

  return (
    <div className={styles.scrim} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        {/* CSS spinner: */}
        <div className={styles.spinner} />
        {/* Or use a GIF: */}
        {/* <img className={styles.gif} src={loadingGif} alt="" /> */}
        <div className={styles.text}>{message || "Loading…"}</div>
      </div>
    </div>
  );
}
