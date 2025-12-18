import React, { useEffect, useRef, useState } from "react";
import styles from "../stylesheets/MultiSelect.module.css";

export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = "Select...",
  maxHeight = 220,
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const selected = Array.isArray(value) ? value : [];

  const toggle = (opt) => {
    const exists = selected.includes(opt);
    const next = exists ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange && onChange(next);
  };

  const filtered = (options || []).filter((o) =>
    String(o).toLowerCase().includes(String(filter || "").toLowerCase())
  );

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length === 0 ? styles.placeholder : undefined}>
          {selected.length === 0 ? placeholder : selected.join(", ")}
        </span>
        <span style={{ opacity: 0.7 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox" style={{ maxHeight: maxHeight + 48 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search..."
            className={styles.filterInput}
            aria-label="Filter options"
          />

          <div className={styles.options} style={{ maxHeight }}>
            {filtered.length === 0 && <div className={styles.noMatches}>No matches</div>}
            {filtered.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`${styles.option} ${checked ? styles.optionChecked : ""}`}
                  onClick={() => toggle(opt)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className={styles.checkbox}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
