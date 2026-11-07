import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works under github.io/<repo>/ without knowing the repo name.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
