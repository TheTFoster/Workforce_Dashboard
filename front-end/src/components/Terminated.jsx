// front-end/src/components/Terminated.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/Home.module.css"; // shared styles
import footerStyles from "../stylesheets/Footer.module.css";
import Footer from "./Footer";
import dbIcon from "../assets/database.svg";
// react-window is optional — dynamically import at runtime to avoid
// ESM/CJS interop issues that can result in a blank screen.
import { statusNorm } from "../utils/status";

/* ===== Helpers (same behavior as Home) ===== */
/* ===== Helpers (same behavior as Home) ===== */
const getCecId = (e) => e?.employeeCode || e?.empCode || e?.emp_code || "";

// Canonical display name from the backend
const getRawDisplayName = (e) => {
  const raw =
    e?.display_name ?? // snake_case from DB if present
    e?.displayName ?? // direct entity getter
    e?.empName ?? // projection based on getEmpName()
    e?.emp_name ?? // snake_case variant
    e?.employeename ?? // legacy
    e?.employeeName ?? // other DTOs
    e?.name ?? // last fallback
    null;

  return typeof raw === "string" ? raw.trim() : "";
};

const nameHasCode = (name, code) => {
  if (!name || !code) return false;
  const n = name.replace(/[()\-—–]/g, " ").toUpperCase();
  const c = String(code).toUpperCase();
  return new RegExp(`\\b${c}\\b`).test(n);
};

const getDisplayName = (e) => {
  const name = getRawDisplayName(e);
  const code = getCecId(e);
  if (!code) return name;
  return nameHasCode(name, code)
    ? name
    : name
    ? `${name} — ${code}`
    : `— ${code}`;
};

// phone formatter from Home (supports multiple numbers + extensions)
const formatPhone = (raw) => {
  if (!raw || String(raw).trim() === "") {
    return { text: "No Number Entered.", href: null };
  }

  const parts = String(raw)
    .split(/[;,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pretty = [];
  const hrefs = [];

  for (const part of parts) {
    const extMatch = part.match(/(?:ext\.?|x)\s*:?\.?\s*(\d{1,6})\s*$/i);
    const ext = extMatch ? extMatch[1] : null;

    const digits = part.replace(/\D/g, "");
    let area = "",
      pre = "",
      line = "";

    if (digits.length === 11 && digits.startsWith("1")) {
      area = digits.slice(1, 4);
      pre = digits.slice(4, 7);
      line = digits.slice(7);
    } else if (digits.length === 10) {
      area = digits.slice(0, 3);
      pre = digits.slice(3, 6);
      line = digits.slice(6);
    } else if (digits.length === 7) {
      pre = digits.slice(0, 3);
      line = digits.slice(3);
    } else {
      pretty.push(part);
      hrefs.push(null);
      continue;
    }

    const text = area ? `(${area}) ${pre}-${line}` : `${pre}-${line}`;
    const href =
      `tel:+1${area ? area + pre + line : pre + line}` + (ext ? `,${ext}` : "");
    pretty.push(ext ? `${text} x${ext}` : text);
    hrefs.push(href);
  }

  return {
    text: pretty.join(" • "),
    href: hrefs.find(Boolean) || null,
  };
};

export default function Terminated() {
  const navigate = useNavigate();

  // data + tiny debug counts
  const [rows, setRows] = useState([]);
  const [serverCount, setServerCount] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState("");

  // header UI
  const [searchNameLive, setSearchNameLive] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [filterProject, setFilterProject] = useState("");

  // profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!profileOpen) return;
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  // load employees: try server-side terminated filter; fallback to all
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setError("");
        setUsedFallback(false);

        const { data } = await api.get("/api/v1/employee/list", {
          params: { status: "terminated" },
          withCredentials: true,
        });
        if (cancel) return;

        const incoming = Array.isArray(data) ? data : data?.employees || [];
        setServerCount(incoming.length);

        if (incoming.length > 0) {
          setRows(incoming);
          return;
        }

        const allRes = await api.get("/api/v1/employee/list", {
          withCredentials: true,
        });
        if (cancel) return;
        const all = Array.isArray(allRes.data)
          ? allRes.data
          : allRes.data?.employees || [];
        setRows(all);
        setUsedFallback(true);
      } catch (e) {
        if (!cancel) setError(e?.message || "Request failed");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setSearchName(searchNameLive.trim()), 250);
    return () => clearTimeout(t);
  }, [searchNameLive]);

  // base list: terminated only (server field or derived)
  const baseList = useMemo(
    () => rows.filter((r) => statusNorm(r) === "terminated"),
    [rows]
  );

  // filter options
  const uniqueGroups = useMemo(
    () =>
      Array.from(
        new Set(baseList.map((e) => e.workGroup).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [baseList]
  );
  const uniqueRanks = useMemo(
    () =>
      Array.from(new Set(baseList.map((e) => e.ranked).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [baseList]
  );
  const uniqueProjects = useMemo(
    () =>
      Array.from(new Set(baseList.map((e) => e.project).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [baseList]
  );

  // apply search + filters
  const filtered = useMemo(() => {
    const q = searchName.toLowerCase();
    return baseList.filter((e) => {
      const name = getRawDisplayName(e).toLowerCase();
      const code = String(getCecId(e) || "").toLowerCase();
      const matchesName = !q || name.includes(q) || code.includes(q);

      const matchesGroup = !filterGroup || e.workGroup === filterGroup;
      const matchesRank = !filterRank || e.ranked === filterRank;
      const matchesProject = !filterProject || e.project === filterProject;

      return matchesName && matchesGroup && matchesRank && matchesProject;
    });
  }, [baseList, searchName, filterGroup, filterRank, filterProject]);

  const clearAllFilters = () => {
    setSearchNameLive("");
    setSearchName("");
    setFilterGroup("");
    setFilterRank("");
    setFilterProject("");
  };

  // virtualized list row
  const ITEM_HEIGHT = 140;
  const GUTTER = 16;

  // Optional virtualized list (loaded dynamically).
  const [VirtualListComp, setVirtualListComp] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import("react-window");
        const Comp = mod.FixedSizeList || (mod && mod.default && mod.default.FixedSizeList) || mod.default || null;
        if (alive && Comp) setVirtualListComp(() => Comp);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("react-window not available in Terminated view; falling back.", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const Row = ({ index, style }) => {
    const e = filtered[index];
    if (!e) return <div style={style} />;

    const phone = formatPhone(e.phoneNumber);

    return (
      <div style={style}>
        <div style={{ marginBottom: GUTTER }}>
          <div className={styles.rowInner} style={{ height: ITEM_HEIGHT }}>
            <div className={styles.employeeItem}>
              <div className={styles.employeeInfo}>
                <p className={styles.employeeName} title={getDisplayName(e)}>
                  {getDisplayName(e)}
                </p>
                <p className={styles.employeeGroup}>
                  {e.workGroup && e.project
                    ? `${e.workGroup} - ${e.project}`
                    : e.workGroup ||
                      e.project ||
                      "Group / Project not available"}
                </p>
                <p className={styles.employeeRank}>
                  {e.ranked || "Rank not available"}
                </p>

                {/* Phone: same UI as on Home (link + ⎘ copy button) */}
                <p className={styles.employeePhoneNumber}>
                  {phone.href ? (
                    <a
                      href={phone.href}
                      onClick={(ev) => ev.stopPropagation()}
                      className={styles.phoneLink}
                      title={`Call ${getDisplayName(e)}`}
                    >
                      {phone.text}
                    </a>
                  ) : (
                    phone.text
                  )}
                  {phone.text && phone.text !== "No Number Entered." && (
                    <button
                      type="button"
                      className={styles.copyPhoneBtn}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        navigator.clipboard
                          .writeText(phone.text)
                          .catch(() => {});
                      }}
                      title="Copy phone"
                      aria-label="Copy phone"
                    >
                      ⎘
                    </button>
                  )}
                </p>
              </div>

              <button
                type="button"
                className={styles.detailsButton}
                onClick={() => navigate(`/employee-details/${e.employeeid}`)}
                title="View details"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header (same as Home) */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src={dbIcon} alt="Database Icon" className={styles.icon} />
          <h1 className={styles.title}>Employee Database</h1>
        </div>

        <div className={styles.headerCenter}>
          <input
            type="text"
            placeholder="Search by name or CEC ID"
            value={searchNameLive}
            onChange={(e) => setSearchNameLive(e.target.value)}
            className={styles.filterInput}
          />
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Groups</option>
            {uniqueGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Ranks</option>
            {uniqueRanks.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Projects</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Right cluster: Clear Filters — Home — Profile */}
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.clearFiltersButton}
            onClick={clearAllFilters}
            title="Reset search and all filters"
          >
            Clear Filters
          </button>

          <button
            type="button"
            className={styles.iconOnlyBtn}
            onClick={() => navigate("/home")}
            aria-label="Home"
            title="Home"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 3.172 3.586 11.586a1 1 0 0 0 1.414 1.414L6 12.999V20a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-7.001l1 1.001a1 1 0 0 0 1.414-1.414L12 3.172z"
              />
            </svg>
          </button>

          <div className={styles.profileWrap} ref={profileRef}>
            <button
              type="button"
              className={styles.profileBtn}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              title="Account"
              onClick={() => setProfileOpen((o) => !o)}
            >
              <svg
                className={styles.profileIcon}
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5C20 16.91 16.418 14 12 14z"
                />
              </svg>
            </button>
            {profileOpen && (
              <div className={styles.profileMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.profileItem}
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/change-password");
                  }}
                >
                  Change Password
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.profileItem}
                  onClick={() => {
                    setProfileOpen(false);
                    localStorage.removeItem("auth");
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.subtitleRow}>
            <h2 className={styles.subtitle}>Terminated</h2>
            <span style={{ color: "#8aa0b4", fontSize: 12 }}>
              server={serverCount} • fallback={usedFallback ? "yes" : "no"} •
              render={filtered.length}
            </span>
          </div>

          {error && (
            <div style={{ color: "#ffce54", marginBottom: 8 }}>
              Error: {error}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className={styles.noData}>No terminated employees.</p>
          ) : VirtualListComp ? (
            <VirtualListComp
              className={styles.employeeList}
              height={650}
              itemCount={filtered.length}
              itemSize={ITEM_HEIGHT + GUTTER}
              width={"100%"}
            >
              {Row}
            </VirtualListComp>
          ) : (
            <div className={styles.employeeList}>
              {filtered.map((emp, idx) => (
                <div key={emp?.employeeid ?? idx}>
                  <Row index={idx} style={{}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer
        showBackToTop={true}
        rightSlot={
          <div className={footerStyles.linkRow}>
            <button
              type="button"
              className={footerStyles.footerLink}
              onClick={() => navigate("/terms")}
            >
              Terms of Use
            </button>
            <span className={footerStyles.sep}>|</span>
            <button
              type="button"
              className={footerStyles.footerLink}
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy
            </button>
            <span className={footerStyles.pageTag}>Terminated View</span>
          </div>
        }
      />
    </div>
  );
}
