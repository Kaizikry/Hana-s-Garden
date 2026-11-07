import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const backendOrigins = [
  "https://script.google.com",
  "https://script.googleusercontent.com",
  ...(process.env.VITE_APPS_SCRIPT_URL ? [new URL(process.env.VITE_APPS_SCRIPT_URL).origin] : []),
];

/** GitHub Pages can't set response headers, so the security policy has to go in a meta tag. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://drive.google.com https://*.googleusercontent.com",
  `connect-src ${backendOrigins.join(" ")}`,
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

// Build only, because the dev server relies on inline scripts for hot reload.
const contentSecurityPolicy: Plugin = {
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [
    { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY }, injectTo: "head-prepend" },
  ],
};

// Relative base so the build works under github.io/<repo>/ without knowing the repo name.
export default defineConfig({
  base: "./",
  plugins: [react(), contentSecurityPolicy],
  server: { port: 5173 },
});
