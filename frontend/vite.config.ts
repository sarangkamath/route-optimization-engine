import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend has no CORS middleware, so in dev the browser talks to Vite
// and Vite forwards /api/* to FastAPI. Change the target if you run uvicorn elsewhere.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
