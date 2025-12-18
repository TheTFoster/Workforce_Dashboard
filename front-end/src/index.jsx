import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { initCsrf } from "./api";

const BASENAME = import.meta.env?.DEV ? "" : "/cec-employee-database";

// Mint CSRF, then mount (no top-level await, no ReactDOM global needed)
initCsrf()
  .catch(() => {})
  .finally(() => {
    const container = document.getElementById("root");
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <BrowserRouter basename={BASENAME}>
          <div className="app">
            <main className="main">
              <App />
            </main>
          </div>
        </BrowserRouter>
      </React.StrictMode>
    );
  });
