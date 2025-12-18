import React, { createContext, useContext, useMemo, useRef, useState } from "react";

const LoadingCtx = createContext(null);

export function LoadingProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const pendingRef = useRef(0);
  const showTimer = useRef(null);
  const minShowTimer = useRef(null);

  const showDelayMs = 150;   // don’t flash for super-fast ops
  const minVisibleMs = 400;  // once shown, keep briefly to avoid flicker

  const start = (msg) => {
    if (msg) setMessage(msg);
    pendingRef.current += 1;

    // only schedule show when transitioning from 0 -> 1
    if (pendingRef.current === 1) {
      clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => {
        setVisible(true);
        clearTimeout(minShowTimer.current);
        minShowTimer.current = setTimeout(() => {}, minVisibleMs); // guard period
      }, showDelayMs);
    }
  };

  const stop = () => {
    if (pendingRef.current === 0) return;
    pendingRef.current -= 1;

    if (pendingRef.current === 0) {
      // Ensure it stayed visible long enough
      const hide = () => {
        setVisible(false);
        setMessage("");
      };
      // If overlay not yet shown, cancel it
      if (!visible) {
        clearTimeout(showTimer.current);
        hide();
      } else {
        // already visible -> wait until minVisibleMs elapsed
        setTimeout(hide, 120); // small grace so it doesn’t “blink”
      }
    }
  };

  const value = useMemo(
    () => ({ start, stop, setMessage, isLoading: visible, message }),
    [visible, message]
  );

  return <LoadingCtx.Provider value={value}>{children}</LoadingCtx.Provider>;
}

export function useLoading() {
  const ctx = useContext(LoadingCtx);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}
