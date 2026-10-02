import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: {
      // Compose はソースをマウントするので、コンテナ内の変更検知に polling が必要。
      usePolling: true,
    },
  },
});
