import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "../stylesheets/NavigationHistory.module.css";

/**
 * NavigationHistory component
 * Provides browser-style back/forward navigation buttons
 * Integrates with React Router to track navigation history
 */
export default function NavigationHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState([location.pathname + location.search]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isNavigatingRef = useRef(false);

  // Track navigation history
  useEffect(() => {
    const newPath = location.pathname + location.search;

    // Skip if we're in the middle of programmatic navigation
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    setHistory((prev) => {
      // Don't add duplicate if it's the same as current
      if (prev[currentIndex] === newPath) {
        return prev;
      }

      // Truncate forward history and add new entry
      const truncated = prev.slice(0, currentIndex + 1);
      const newHistory = [...truncated, newPath];
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [location.pathname, location.search]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  const handleBack = () => {
    if (canGoBack) {
      isNavigatingRef.current = true;
      setCurrentIndex((prev) => prev - 1);
      navigate(-1);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      isNavigatingRef.current = true;
      setCurrentIndex((prev) => prev + 1);
      navigate(1);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + Left Arrow = Back
      if (e.altKey && e.key === "ArrowLeft" && canGoBack) {
        e.preventDefault();
        handleBack();
      }
      // Alt + Right Arrow = Forward
      if (e.altKey && e.key === "ArrowRight" && canGoForward) {
        e.preventDefault();
        handleForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoBack, canGoForward, currentIndex]);

  return (
    <div className={styles.navHistory} role="navigation" aria-label="Page navigation">
      <button
        type="button"
        onClick={handleBack}
        disabled={!canGoBack}
        className={`${styles.navBtn} ${!canGoBack ? styles.disabled : ""}`}
        title="Go back (Alt + ←)"
        aria-label="Go back to previous page"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={handleForward}
        disabled={!canGoForward}
        className={`${styles.navBtn} ${!canGoForward ? styles.disabled : ""}`}
        title="Go forward (Alt + →)"
        aria-label="Go forward to next page"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Optional: Show current position in history */}
      {history.length > 1 && (
        <span className={styles.historyCount} aria-live="polite">
          {currentIndex + 1} / {history.length}
        </span>
      )}
    </div>
  );
}
