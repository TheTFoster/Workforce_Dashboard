import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../stylesheets/Policy.module.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const COMPANY = {
    name: "CEC", 
    service: "CEC Employee Database",
    effectiveDate: "2025-09-16",
    contacts: {
      name: "TJ Foster",
      email: "rfoster@cecfg.com",
      phone: "817-917-3738",
      address: "1275 Valley View Ln, Irving, TX 75061",
    },
    retention: {
      accountMonths: 6,
      resetHours: 24,
      logsDays: 180,
      recordsYears: 7,
    },
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <div className={styles.meta}>
          <span className={styles.pill}>Effective: {COMPANY.effectiveDate}</span>
          <button className={styles.btn} onClick={() => window.print()}>Print</button>
          <button className={styles.btnSecondary} onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <article className={styles.card}>
        <p className={styles.lead}>
          This Privacy Policy explains how <strong>{COMPANY.name}</strong> (“we,” “us,” “our”)
          handles information in the <strong>{COMPANY.service}</strong> (the “Service”).
        </p>

        <nav className={styles.toc}>
          <a href="#scope">1. Scope</a>
          <a href="#collect">2. What we collect</a>
          <a href="#use">3. Why we use it</a>
          <a href="#legal">4. Legal bases</a>
          <a href="#sharing">5. Sharing</a>
          <a href="#retention">6. Retention</a>
          <a href="#security">7. Security</a>
          <a href="#rights">8. Your rights</a>
          <a href="#transfers">9. International transfers</a>
          <a href="#children">10. Children</a>
          <a href="#changes">11. Changes</a>
          <a href="#contact">12. Contact</a>
        </nav>

        <section id="scope" className={styles.section}>
          <h2>1) Scope</h2>
          <p>
            Applies to all authorized users (employees, supervisors, admins) of the Service.
            This is an internal/partner business system, not a consumer app.
          </p>
        </section>

        <section id="collect" className={styles.section}>
          <h2>2) What we collect</h2>
          <ul>
            <li><strong>Account & authentication:</strong> CEC ID/employee code, hashed passwords, reset token hashes, timestamps, role/profile.</li>
            <li><strong>Employee records:</strong> Name, group, rank, project/job number, phone, training/skills, start/end dates, transfers, notes, attachments.</li>
            <li><strong>Usage & device:</strong> IP, browser/OS, activity timestamps, error logs.</li>
            <li><strong>Cookies & local storage:</strong> session cookie; optional local/session storage for UI state on your device.</li>
            <li><strong>Support data:</strong> bug reports, screenshots, emails.</li>
          </ul>
          <p>We do not sell personal information or use it for advertising.</p>
        </section>

        <section id="use" className={styles.section}>
          <h2>3) Why we use it</h2>
          <ul>
            <li>Operate, secure, and troubleshoot the Service.</li>
            <li>Manage projects, staffing, training, and transfers.</li>
            <li>Generate reports/exports you request.</li>
            <li>Prevent fraud/abuse (rate limiting, audit).</li>
            <li>Comply with law and company policy.</li>
          </ul>
        </section>

        <section id="legal" className={styles.section}>
          <h2>4) Legal bases (if GDPR applies)</h2>
          <ul>
            <li><strong>Legitimate interests/contract:</strong> running an internal employee system, securing accounts.</li>
            <li><strong>Legal obligation:</strong> audits, lawful requests, retention rules.</li>
            <li><strong>Consent:</strong> only when explicitly requested (rare).</li>
          </ul>
        </section>

        <section id="sharing" className={styles.section}>
          <h2>5) Sharing</h2>
          <ul>
            <li><strong>Service providers:</strong> hosting, email, logging/monitoring, under contract and least privilege.</li>
            <li><strong>Internal recipients:</strong> HR/management/authorized supervisors per role-based access.</li>
            <li><strong>Legal/security:</strong> when required by law or to protect rights, safety, or system integrity.</li>
          </ul>
        </section>

        <section id="retention" className={styles.section}>
          <h2>6) Retention</h2>
          <ul>
            <li><strong>Credentials:</strong> while account is active + {COMPANY.retention.accountMonths} months.</li>
            <li><strong>Password reset tokens:</strong> hashed; expire after {COMPANY.retention.resetHours} hours; used tokens are immediately invalidated.</li>
            <li><strong>Employee records:</strong> employment + {COMPANY.retention.recordsYears} years (or as required by policy/law).</li>
            <li><strong>Logs/metrics:</strong> typically {COMPANY.retention.logsDays} days unless needed longer for investigations.</li>
          </ul>
        </section>

        <section id="security" className={styles.section}>
          <h2>7) Security</h2>
          <ul>
            <li>TLS in transit; database/network controls at rest.</li>
            <li>BCrypt (or stronger) password hashing; reset token <em>hashing</em>.</li>
            <li>Role-based access, least privilege, audit trails, rate limiting.</li>
            <li>Encrypted, access-controlled backups.</li>
          </ul>
          <p>No system is 100% secure, but we work to prevent and detect misuse.</p>
        </section>

        <section id="rights" className={styles.section}>
          <h2>8) Your choices & rights</h2>
          <ul>
            <li>Access/correct/delete your profile where allowed by policy.</li>
            <li>Export reports you’re authorized to access.</li>
            <li>Clear browser storage to remove local UI state.</li>
            <li>Where GDPR/CPRA apply, you may have additional rights; contact us below.</li>
          </ul>
        </section>

        <section id="transfers" className={styles.section}>
          <h2>9) International transfers</h2>
          <p>When processed outside your region, we use appropriate safeguards with providers.</p>
        </section>

        <section id="children" className={styles.section}>
          <h2>10) Children</h2>
          <p>The Service is for authorized workers, not children.</p>
        </section>

        <section id="changes" className={styles.section}>
          <h2>11) Changes</h2>
          <p>We’ll update this page and notify users in-app or by email if changes are material.</p>
        </section>

        <section id="contact" className={styles.section}>
          <h2>12) Contact</h2>
          <address className={styles.address}>
            <div><strong>{COMPANY.contacts.name}</strong></div>
            <div><a href={`mailto:${COMPANY.contacts.email}`}>{COMPANY.contacts.email}</a></div>
            <div>{COMPANY.contacts.phone}</div>
            <div>{COMPANY.contacts.address}</div>
          </address>
        </section>

        <p className={styles.disclaimer}>
          This page is provided for transparency and internal compliance. It is not legal advice.
        </p>
      </article>
    </main>
  );
}
