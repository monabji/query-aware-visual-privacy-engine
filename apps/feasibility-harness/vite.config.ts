import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Serve runtime code (OCR worker/core, MediaPipe WASM) from this origin
 * instead of third-party CDNs, so executable code is pinned to the installed
 * package versions. Only model weights and language data are fetched remotely.
 */
const require = createRequire(import.meta.url);
const packageDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

const VENDOR_DIRS: Record<string, string> = {
  "tesseract-worker": join(packageDir("tesseract.js"), "dist"),
  "tesseract-core": packageDir("tesseract.js-core"),
  "mediapipe-wasm": join(packageDir("@mediapipe/tasks-vision"), "wasm"),
};

const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".map": "application/json",
};

function vendorAssets(): Plugin {
  return {
    name: "qavpe-vendor-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/vendor\/([^/]+)\/([^?]+)/.exec(req.url ?? "");
        const root = match ? VENDOR_DIRS[match[1] as string] : undefined;
        if (!match || !root) return next();
        const file = normalize(join(root, decodeURIComponent(match[2] as string)));
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const [prefix, root] of Object.entries(VENDOR_DIRS)) {
        for (const name of readdirSync(root)) {
          if (![".js", ".wasm"].includes(extname(name))) continue;
          this.emitFile({ type: "asset", fileName: `vendor/${prefix}/${name}`, source: readFileSync(join(root, name)) });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [vendorAssets()],
  server: { port: 5173, strictPort: true },
  build: { target: "es2022" },
  worker: { format: "es" },
});
