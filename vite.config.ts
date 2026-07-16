import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const productionCsp =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const developmentCsp = productionCsp
  .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
  .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");

const securityHeaders = {
  "Content-Security-Policy": productionCsp,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: "development-csp",
      apply: "serve",
      transformIndexHtml(html) {
        return html.replace(
          "script-src 'self' 'wasm-unsafe-eval'",
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
        ).replace(
          "style-src 'self'",
          "style-src 'self' 'unsafe-inline'",
        );
      },
    },
  ],
  server: {
    headers: {
      ...securityHeaders,
      "Content-Security-Policy": developmentCsp,
    },
  },
  preview: {
    headers: securityHeaders,
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  worker: {
    format: "es",
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
