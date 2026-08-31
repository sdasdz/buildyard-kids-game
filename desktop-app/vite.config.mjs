import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const desktopDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: desktopDir,
  base: "./",
  publicDir: path.resolve(desktopDir, "../public"),
  plugins: [react()],
  build: {
    outDir: path.resolve(desktopDir, "app-dist"),
    emptyOutDir: true,
    target: "chrome134",
    sourcemap: false,
  },
});
