import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import styles from "../stylesheets/PrimaryNav.module.css";
import api from "../api";
import NavigationHistory from "./NavigationHistory";

/**
 * PrimaryNav (portal version)
 * - Click OR hover to open.
 * - Menus render into document.body (fixed position) to dodge z-index/overflow traps.
 * - Click outside / Escape closes.
 */
export default function PrimaryNav({ onExport, onOpenBatch }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // id of the open menu
  const [coords, setCoords] = useState({}); // id -> {left, top, width}
  const [hoverCloseTimer, setHoverCloseTimer] = useState(null); // timer for delayed close
  const [profileOpen, setProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const anchors = useRef({}); // id -> element
  const wrapRef = useRef(null);
  const profileRef = useRef(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/v1/auth/me", { withCredentials: true });
        const roles = res?.data?.roles || [];
        if (mounted) {
          if (Array.isArray(roles) && roles.includes("ROLE_ADMIN")) {
            setIsAdmin(true);
          }
          if (res?.data?.firstName) {
            setFirstName(res.data.firstName);
          }
        }
      } catch (_e) {
        // not authed or no roles — silently ignore
      }
    })();
    return () => (mounted = false);
  }, []);

  // Close profile dropdown on outside click or escape
  useEffect(() => {
    const handleClick = (e) => {
      if (!profileOpen) return;
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [profileOpen]);

  const NAV = [
    { id: "home", label: "Dashboard", to: "/" },
    { id: "kpi", label: "KPI Dashboard", to: "/kpi-dashboard" },
    {
      id: "people",
      label: "People",
      children: [
        { label: "Add Employee", to: "/employee/new" },
        { label: "Inactive / On Leave", to: "/inactive-on-leave" },
        { label: "Terminated", to: "/terminated" },
        { label: "Transfers", to: "/transfers" },
        { label: "Leased Labor", to: "/leased-labor" },
        { label: "Timecards", to: "/timecards" },
      ],
    },
    {
      id: "planning",
      label: "Planning",
      children: [
        { label: "Reports", to: "/reports" },
        { label: "Gantt View", to: "/gantt" },
        { label: "Transfers", to: "/transfers" },
        { label: "New Hires", to: "/new-hires" },
        { label: "Mandown", to: "/mandown" },
      ],
    },
    // Admin menu only visible to admins
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin",
            children: [
              { label: "Alerts", to: "/alerts" },
              { label: "Orphan Punches", to: "/orphan-punches" },
              { label: "Import Timecards", to: "/admin/timecards" },
              { label: "Create User", to: "/admin/create-user" },
              onOpenBatch ? { label: "Batch Update", action: onOpenBatch } : null,
              onExport ? { label: "Export to Excel", action: onExport } : null,
            ].filter(Boolean),
          },
        ]
      : []),
  ];

  /* -------- helpers ---------- */
  const go = (to) => {
    setMobileOpen(false);
    setOpenMenu(null);
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    if (to) navigate(to);
  };
  const run = (item) => {
    if (!item) return;
    if (item.action) {
      item.action();
      setMobileOpen(false);
      setOpenMenu(null);
      if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    } else if (item.to) {
      go(item.to);
    }
  };

  const handleMouseEnterMenu = (menuId) => {
    // Clear any pending close timer
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    setOpenMenu(menuId);
  };

  const handleMouseLeaveButton = () => {
    // Start close timer when leaving button
    const timer = setTimeout(() => {
      setOpenMenu(null);
    }, 150); // 150ms delay to allow moving to dropdown
    setHoverCloseTimer(timer);
  };

  const handleMouseEnterDropdown = () => {
    // Cancel close timer when entering dropdown
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
  };

  const handleMouseLeaveDropdown = () => {
    // Close immediately when leaving dropdown
    setOpenMenu(null);
  };
  const pathIsActive = (top) => {
    if (top.to && (pathname === top.to || pathname.startsWith(`${top.to}/`)))
      return true;
    if (Array.isArray(top.children)) {
      return top.children.some(
        (c) => c?.to && (pathname === c.to || pathname.startsWith(`${c.to}/`))
      );
    }
    return false;
  };

  /* --- measure anchor button and set portal menu position --- */
  const measure = (id) => {
    const el = anchors.current[id];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords((m) => ({
      ...m,
      [id]: {
        left: Math.max(8, Math.floor(r.left)),
        top: Math.floor(r.bottom + 2),
        width: Math.max(220, Math.floor(r.width)),
      },
    }));
  };

  useLayoutEffect(() => {
    if (openMenu) measure(openMenu);
  }, [openMenu]);

  // keep menu glued on scroll/resize
  useEffect(() => {
    if (!openMenu) return;
    const onMove = () => measure(openMenu);
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [openMenu]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    };
  }, [hoverCloseTimer]);

  // outside click + Escape closes
  useEffect(() => {
    const onDoc = (e) => {
      if (e.type === "keydown" && e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
        return;
      }

      if (e.type === "click") {
        const t = e.target;

        // If the click happened inside the portaled dropdown, don't close.
        if (t.closest?.(`.${styles.dropdownPortal}`)) return;

        // If the click is outside the nav wrapper, close.
        if (wrapRef.current && !wrapRef.current.contains(t)) {
          setOpenMenu(null);
          setMobileOpen(false);
        }
      }
    };

    // Use 'click' instead of 'mousedown' so menu item onClick runs first.
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onDoc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onDoc);
    };
  }, []);

  const TopButton = ({ top, hasChildren, isActive }) => {
    const isOpen = openMenu === top.id;
    return (
      <button
        ref={(el) => (anchors.current[top.id] = el)}
        type="button"
        className={styles.topBtn}
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        onClick={() =>
          hasChildren ? setOpenMenu(isOpen ? null : top.id) : go(top.to)
        }
        onMouseEnter={() => {
          if (hasChildren) {
            if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
            handleMouseEnterMenu(top.id);
          }
        }}
        onMouseLeave={() => hasChildren && handleMouseLeaveButton()}
        onFocus={() => hasChildren && setOpenMenu(top.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            hasChildren ? setOpenMenu(isOpen ? null : top.id) : go(top.to);
          }
          if (e.key === "ArrowDown" && hasChildren) {
            e.preventDefault();
            setOpenMenu(top.id);
          }
        }}
        data-active={isActive ? "true" : "false"}
      >
        {top.label}
        {hasChildren && (
          <span className={styles.caret} aria-hidden="true">
            ▾
          </span>
        )}
      </button>
    );
  };

  /* -------- portal renderer ---------- */
  const renderDropdown = (top) => {
    const hasChildren = Array.isArray(top.children) && top.children.length;
    const isOpen = openMenu === top.id;
    if (!hasChildren || !isOpen) return null;

    const c = coords[top.id] || { left: 16, top: 64, width: 240 };

    // scrim (transparent) to catch outside clicks under the menu
    const scrim = (
      <div
        className={styles.scrim}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40, // above nav (10), below menu (50)
        }}
        onClick={() => setOpenMenu(null)}
        aria-hidden="true"
      />
    );
    const menu = (
      <ul
        role="menu"
        className={`${styles.dropdown} ${styles.dropdownPortal}`}
        style={{
          position: "fixed",
          left: c.left,
          top: c.top,
          minWidth: c.width,
          display: "block",
          zIndex: 50, // top of stack
        }}
        data-open="true"
        onMouseEnter={handleMouseEnterDropdown}
        onMouseLeave={handleMouseLeaveDropdown}
      >
        {top.children.map((child, i) => (
          <li key={`${top.id}-${i}`} role="none">
            <button
              type="button"
              role="menuitem"
              className={styles.dropItem}
              onClick={() => run(child)}
            >
              {child.label}
            </button>
          </li>
        ))}
      </ul>
    );

    return createPortal(
      <>
        {scrim}
        {menu}
      </>,
      document.body
    );
  };

  return (
    <nav
      className={styles.bar}
      ref={wrapRef}
      aria-label="Primary"
      style={{
        position: "relative",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      {/* Navigation history buttons */}
      <NavigationHistory />

      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        aria-expanded={mobileOpen}
        aria-controls="primary-nav"
        onClick={() => setMobileOpen((o) => !o)}
      >
        <span className={styles.hamburgerBox} aria-hidden="true">
          <span className={styles.hamburgerInner} />
        </span>
        Menu
      </button>

      <ul
        id="primary-nav"
        className={`${styles.menu} ${mobileOpen ? styles.menuOpen : ""}`}
        role="menubar"
      >
        {NAV.map((top) => {
          const hasChildren =
            Array.isArray(top.children) && top.children.length;
          const isActive = pathIsActive(top);
          return (
            <li
              key={top.id}
              role="none"
              className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
            >
              <TopButton
                top={top}
                hasChildren={hasChildren}
                isActive={isActive}
              />
              {/* portal dropdown */}
              {renderDropdown(top)}
            </li>
          );
        })}
      </ul>

      {/* Welcome message */}
      {firstName && (
        <div className={styles.welcomeText}>
          Welcome, {firstName}
        </div>
      )}

      {/* Account button */}
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
    </nav>
  );
}
