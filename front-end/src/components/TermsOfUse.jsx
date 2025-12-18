import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../stylesheets/Policy.module.css";

export default function TermsOfUse() {
  const navigate = useNavigate();

  const TERMS = {
    company: "CEC", 
    service: "CEC Employee Database",
    effectiveDate: "2025-09-16",
    governingLaw: "State of Texas",
    venue: "Dallas, Texas",
    liabilityCapUSD: 10000, // $[Amount]
    contact: {
      name: "TJ Foster",
      email: "rfoster@cecfg.com",
      phone: "817-917-3738",
      address: "1275 Valley View Ln, Irving, TX 75061",
    },
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Terms of Use</h1>
        <div className={styles.meta}>
          <span className={styles.pill}>Effective: {TERMS.effectiveDate}</span>
          <button className={styles.btn} onClick={() => window.print()}>Print</button>
          <button className={styles.btnSecondary} onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <article className={styles.card}>
        <p className={styles.lead}>
          These Terms govern your use of the <strong>{TERMS.service}</strong> (the “Service”). By using it, you agree to these Terms.
        </p>

        <section className={styles.section}>
          <h2>1) Who may use the Service</h2>
          <p>Only authorized users of {TERMS.company} (employees/contractors granted access). Do not share accounts.</p>
        </section>

        <section className={styles.section}>
          <h2>2) Accounts & security</h2>
          <ul>
            <li>Keep credentials confidential; you’re responsible for activity under your account.</li>
            <li>Use strong, unique passwords; resets use time-limited, single-use tokens.</li>
            <li>Report suspected compromise to IT immediately.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3) Acceptable use</h2>
          <p>Do not upload unlawful content, misuse confidential data, attempt to bypass security, scrape, disrupt the Service, or share exports outside approved channels.</p>
        </section>

        <section className={styles.section}>
          <h2>4) Your content</h2>
          <p>
            You grant {TERMS.company} a limited license to process content you submit solely to operate the Service
            (store, display to authorized users, back up, and analyze for security/performance).
            You represent you have rights to provide that content.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5) Intellectual property</h2>
          <p>The Service, code, and design are owned by {TERMS.company} (or licensors). No IP rights are granted beyond limited use to perform your job.</p>
        </section>

        <section className={styles.section}>
          <h2>6) Third-party services</h2>
          <p>We use common infrastructure providers (hosting, email, logging). We’re not responsible for third-party sites you may link to from the Service.</p>
        </section>

        <section className={styles.section}>
          <h2>7) Beta/experimental features</h2>
          <p>Beta features are provided “as is” and may change or be removed.</p>
        </section>

        <section className={styles.section}>
          <h2>8) Disclaimers</h2>
          <p>The Service is provided “as is” and “as available.” We disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement to the maximum extent allowed by law.</p>
        </section>

        <section className={styles.section}>
          <h2>9) Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, {TERMS.company} is not liable for indirect, incidental, special,
            consequential, or punitive damages, or lost profits/revenue/data. Our aggregate liability related to the Service
            will not exceed <strong>${TERMS.liabilityCapUSD.toLocaleString()}</strong>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10) Indemnification</h2>
          <p>You agree to follow company policy and indemnify {TERMS.company} for losses arising from willful or unlawful misuse of the Service, to the extent permitted by law.</p>
        </section>

        <section className={styles.section}>
          <h2>11) Suspension & termination</h2>
          <p>We may suspend or terminate access for policy violations, security threats, or upon HR separation. Business records may be retained per policy.</p>
        </section>

        <section className={styles.section}>
          <h2>12) Privacy</h2>
          <p>See our <a href="/privacy">Privacy Policy</a> for how we handle personal data.</p>
        </section>

        <section className={styles.section}>
          <h2>13) Governing law & dispute resolution</h2>
          <p>These Terms are governed by the laws of {TERMS.governingLaw}. Venue: {TERMS.venue}. (If your policy uses arbitration instead, edit this section.)</p>
        </section>

        <section className={styles.section}>
          <h2>14) Changes</h2>
          <p>We can update these Terms. Material changes will be notified in-app or by email. Continued use after the effective date means you accept the updates.</p>
        </section>

        <section className={styles.section}>
          <h2>15) Contact</h2>
          <address className={styles.address}>
            <div><strong>{TERMS.contact.name}</strong></div>
            <div><a href={`mailto:${TERMS.contact.email}`}>{TERMS.contact.email}</a></div>
            <div>{TERMS.contact.phone}</div>
            <div>{TERMS.contact.address}</div>
          </address>
        </section>

        <p className={styles.disclaimer}>
          This page summarizes internal use terms and isn’t legal advice.
        </p>
      </article>
    </main>
  );
}
