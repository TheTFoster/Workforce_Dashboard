// vite.config.mjs
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), "");

  const isDev = mode === "development";
  const isLocalProd = mode === "localprod";
  const base = (isDev || isLocalProd) ? "/" : "/cec-employee-database/";

  return {
    base,
    plugins: [svgr(), react()],
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "http://localhost:8086",
          changeOrigin: true,
        },
        "/csrf-token": {
          target: "http://localhost:8086",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": {
          target: "http://localhost:8086",
          changeOrigin: true,
        },
        "/csrf-token": {
          target: "http://localhost:8086",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom")
      }
    },
    define: {
      __APP_BASENAME__: JSON.stringify(base.replace(/\/$/, ""))
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks for better caching
            if (id.includes('node_modules')) {
              // React core libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // React Router
              if (id.includes('react-router-dom')) {
                return 'router';
              }
              // Large Excel library
              if (id.includes('xlsx')) {
                return 'xlsx';
              }
              // Other vendor libraries
              if (id.includes('axios') || id.includes('react-window') || 
                  id.includes('react-toastify') || id.includes('react-icons')) {
                return 'vendor-utils';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 600
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.js",
      globals: true,
      include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "e2e/**",
        "src/App.test.js", // legacy CRA placeholder
        "src/components/AddEmployee.test.js", // legacy placeholder
      ],
    }
  };
});
