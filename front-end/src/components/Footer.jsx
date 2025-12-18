import React from "react";
import styles from "../stylesheets/Footer.module.css";

export default function Footer({
  showBackToTop = true,
  rightSlot = null,
}) {
  const onTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.brand}>CEC</span>
        <span className={styles.sep}>•</span>
        <span className={styles.name}>Employee Database</span>
      </div>

      <div className={styles.center}>
        {showBackToTop && (
          <button className={styles.toTop} onClick={onTop} aria-label="Back to top">
            ↑ Back to top
          </button>
        )}
      </div>

      <div className={styles.right}>
        {rightSlot}
      </div>
    </footer>
  );
}
