import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  // Dev convenience: `npm run dev` proxies API calls to the Fastify server
  // (`npm start`). Respects PORT so it still works when 8080 is taken (e.g. by Apache).
  server: {
    proxy: {
      "/api": `http://localhost:${process.env.PORT || 8080}`,
    },
  },
});
