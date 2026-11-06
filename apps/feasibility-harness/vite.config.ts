import { execSync } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Serve runtime code (OCR worker/core, MediaPipe WASM) from this origin
 * instead of third-party CDNs, so executable code is pinned to the installed
 * package versions. Only model weights and language data are fetched remotely.
 */
const require = createRequire(import.meta.url);
/** Locate an installed package directory without relying on its `exports` map. */
function packageDir(name: string): string {
  for (const base of require.resolve.paths(name) ?? []) {
    const candidate = join(base, name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
  }
  throw new Error(`package not installed: ${name}`);
}

const VENDOR_DIRS: Record<string, string> = {
  "tesseract-worker": join(packageDir("tesseract.js"), "dist"),
  "tesseract-core": packageDir("tesseract.js-core"),
  "mediapipe-wasm": join(packageDir("@mediapipe/tasks-vision"), "wasm"),
  "onnxruntime-web": join(packageDir("onnxruntime-web"), "dist"),
};

/** Only the runtime files the harness loads are emitted for onnxruntime-web. */
const VENDOR_FILTER: Record<string, RegExp> = {
  "onnxruntime-web": /^ort-wasm-simd-threaded\.asyncify\.(mjs|wasm)$/,
};

/**
 * Cross-origin isolation enables multi-threaded WASM and
 * performance.measureUserAgentSpecificMemory() for memory measurement.
 */
const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
} as const;

const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
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
        // Worker scripts must carry their own isolation headers under COEP.
        for (const [name, value] of Object.entries(ISOLATION_HEADERS)) res.setHeader(name, value);
        res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const [prefix, root] of Object.entries(VENDOR_DIRS)) {
        for (const name of readdirSync(root)) {
          if (![".js", ".mjs", ".wasm"].includes(extname(name))) continue;
          if (VENDOR_FILTER[prefix] && !VENDOR_FILTER[prefix].test(name)) continue;
          this.emitFile({ type: "asset", fileName: `vendor/${prefix}/${name}`, source: readFileSync(join(root, name)) });
        }
      }
    },
  };
}

function gitRevision(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [vendorAssets()],
  define: { __HARNESS_REVISION__: JSON.stringify(gitRevision()) },
  server: {
    port: 5173,
    strictPort: true,
    headers: ISOLATION_HEADERS,
  },
  build: { target: "es2022" },
  worker: { format: "es" },
});
