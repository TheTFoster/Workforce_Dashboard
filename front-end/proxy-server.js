// Simple Node reverse proxy to serve the built Vite app and proxy API calls.
// Usage:
//   1) npm run build
//   2) node proxy-server.js
// Then browse http://localhost:4173/ (adjust PORT below if desired).

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import history from "connect-history-api-fallback";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const apiTarget = "http://localhost:8086"; // backend target

const app = express();

// Proxy API + CSRF to backend
app.use(
  ["/api", "/csrf-token"],
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    ws: true,
  })
);

// SPA fallback (serves index.html for unknown routes)
app.use(history());

// Serve built static assets
app.use(express.static(distPath));

const PORT = process.env.PORT || 4173;
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});

