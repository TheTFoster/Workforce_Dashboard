# Copilot AI Agent Instructions for EmployeeDB

## Overview
This repository is a full-stack Employee Database application with a React (Vite) front-end and a Spring Boot (Java) back-end. It manages employee records, transfers, timecards, and related business logic. The codebase is designed for maintainability, performance, and developer productivity.

---

## Project Structure

- **Backend:**
  - `src/main/java/com/cec/EmployeeDB/` — Spring Boot application, controllers, models.
  - `src/main/resources/` — Configuration (`application.properties`), environment-specific overrides.
- **Frontend:**
  - `front-end/` — React 18 app (Vite), CSS Modules, modular components.
  - `front-end/src/components/` — Main React components (e.g., `Transfers.jsx`, `EmployeeDetails.jsx`).
  - `front-end/src/api/` — API abstraction (Axios), XSRF handling.
  - `front-end/src/utils/` — Shared helpers (status normalization, vendor config, etc).
- **Other:**
  - `Dockerfile`, `compose.yaml` — Containerization and local dev setup.
  - `README.md` — Project and front-end usage notes.

---

## Key Conventions

- **Frontend:**
  - Use dynamic `import()` for optional/large dependencies (e.g., `react-window` for virtualization) to avoid ESM/CJS issues.
  - All API calls go through `front-end/src/api/index.js` (Axios instance with XSRF/cookie support).
  - CSS Modules for component styles (e.g., `Transfers.module.css`).
  - Use localStorage for UI state persistence (e.g., row highlighting), but prefer server persistence for critical state.
  - Navigation between employee-related pages uses React Router (`useNavigate`).
  - Highlighting: Row highlight state is both persisted locally and can be synced to the server for global consistency.
  - PATCH/POST requests must include XSRF token (handled by API layer).

- **Backend:**
  - Spring Boot REST controllers in `controller/`.
  - JPA/Hibernate for DB access; configuration in `application.properties`.
  - Environment secrets (DB credentials, etc) are loaded from `secrets.properties` (never commit secrets).
  - PATCH endpoints should accept `null` for fields to clear (e.g., transfer status).
  - Logging is INFO by default; DEBUG/TRACE in dev profile.

---

## AI Agent Guidance

- **When adding new features:**
  - Follow the modular structure; add new React components to `front-end/src/components/`.
  - For new API endpoints, add controller methods in the backend and corresponding functions in `front-end/src/api/`.
  - Use dynamic imports for large/optional front-end dependencies.
  - Always update both client and server for changes to data contracts (DTOs, API shapes).

- **When fixing bugs:**
  - Reproduce in both dev and production builds if possible.
  - Check for both client-side and server-side causes (e.g., PATCH 400 errors may be due to null handling on either side).
  - Use the provided test scripts (`mvnw verify`, `npm test`).

- **When updating dependencies:**
  - Use `npm` for front-end, `mvnw` for backend.
  - Prefer non-breaking upgrades; test thoroughly.

- **When working with highlights/virtualization:**
  - Row highlighting logic is shared between localStorage and server (see `Transfers.jsx`).
  - Table virtualization is implemented with dynamic `import('react-window')`.

---

## Build & Run

- **Backend:**
  - `./mvnw verify` — Build and test Java backend.
  - Runs on port 8086 by default.
- **Frontend:**
  - `cd front-end && npm install && npm run dev` — Start React dev server.
  - Production build: `npm run build` (output in `front-end/build/`).

---

## Security & Secrets
- Never commit secrets. Use `secrets.properties` or environment variables for sensitive config.
- XSRF protection is enabled; all non-GET API calls require the XSRF token (handled by API layer).

---

## Testing
- Backend: `./mvnw verify`
- Frontend: `cd front-end && npm test`

---

## Additional Notes
- For new AI agents: Always check for dynamic imports, XSRF handling, and highlight persistence logic when working on UI features.
- For backend: PATCH endpoints should be null-safe and allow clearing fields by accepting `null`.
- For onboarding: See this file and `front-end/README.md` for developer setup.
