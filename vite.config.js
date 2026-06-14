import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  // Dev convenience: `npm run dev` (5173) proxies API calls to `npm start` (8080).
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
