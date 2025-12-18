import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";

/**
 * Lightweight “navigating…” signal on route changes.
 * Your page-level data fetches should also call start/stop (below).
 */
export default function RouteProgress() {
  const { pathname, search } = useLocation();
  const { start, stop, setMessage } = useLoading();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setMessage("Navigating…");
    start();
    const t = setTimeout(stop, 800); // short pulse; real fetches will extend via start/stop
    return () => clearTimeout(t);
  }, [pathname, search, setMessage, start, stop]);

  return null;
}
