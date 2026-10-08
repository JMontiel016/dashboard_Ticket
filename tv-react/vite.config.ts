import { readFile } from "node:fs/promises";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * El build se escribe dentro de ../public (la carpeta que publica Cloudflare Pages)
 * SIN vaciarla: genera tv.html y la carpeta tv-react-assets/.
 * index.html, _headers y _routes.json quedan intactos.
 */
export default defineConfig({
  plugins: [react(), {
    name: "bepa-dashboard-shared-assets",
    configureServer(server) {
      const shared: Record<string, string> = {
        "/enhancements/theme.js": "text/javascript",
        "/enhancements/people.js": "text/javascript",
        "/enhancements/dashboard.css": "text/css",
        "/enhancements/dashboard.js": "text/javascript",
        "/enhancements/dashboard-workspace.js": "text/javascript",
        "/vendor/chart.umd.js": "text/javascript",
      };
      server.middlewares.use(async (req, res, next) => {
        const apiPath = req.url?.split("?")[0];
        if ((req.method === "GET" && (apiPath === "/api/jira-issue" || apiPath === "/api/jira-attachment")) || (req.method === "POST" && apiPath === "/api/jira")) {
          const env = { ...loadEnv(server.config.mode, new URL("..", import.meta.url).pathname, ""), ...process.env };
          if (!env.JIRA_EMAIL || !env.JIRA_TOKEN) {
            if(apiPath!=="/api/jira-attachment")return next();
            res.statusCode=503;res.setHeader("Content-Type","application/json");res.end(JSON.stringify({error:"La conexión local a Jira todavía no está configurada.",code:"JIRA_CONFIG_MISSING",action:"Desde la raíz del proyecto, ejecutá npm run dev e ingresá tu correo y token de API una sola vez en la terminal."}));return;
          }
          try{
            const file=apiPath==="/api/jira"?"jira.js":apiPath==="/api/jira-issue"?"jira-issue.js":"jira-attachment.js";
            // Vite's loader supports the same ESM Functions on all supported Node versions.
            const handler=await server.ssrLoadModule(new URL(`../functions/api/${file}`,import.meta.url).pathname);
            const chunks:Buffer[]=[];if(req.method==="POST")for await(const chunk of req)chunks.push(Buffer.from(chunk));
            const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers as Record<string,string>,...(chunks.length?{body:Buffer.concat(chunks).toString("utf8")}:{})});
            const result:Response=await handler[req.method==="POST"?"onRequestPost":"onRequestGet"]({request,env});
            res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await result.arrayBuffer()));return;
          }catch{res.statusCode=502;res.setHeader("Content-Type","application/json");res.end(JSON.stringify({error:"No se pudo completar la lectura local de Jira.",action:"Verificá la conexión y volvé a intentar."}));return;}
        }
        if (req.url?.split("?")[0] === "/api/bull-job-action" && req.method === "POST") {
          const { onRequestPost } = await import("../functions/api/bull-job-action.js");
          const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const request = new Request(`http://${req.headers.host}/api/bull-job-action`, { method: "POST", headers: req.headers as Record<string,string>, body: Buffer.concat(chunks).toString("utf8") });
          const result = await onRequestPost({ request, env: { ...loadEnv(server.config.mode, new URL("..", import.meta.url).pathname, ""), ...process.env } });
          res.statusCode = result.status; res.setHeader("Content-Type", "application/json"); res.end(await result.text()); return;
        }
        const path = req.url?.split("?")[0] || "";
        if (!shared[path]) return next();
        try {
          const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
          res.setHeader("Content-Type", shared[path]); res.end(bytes);
        } catch { next(); }
      });
    },
  }],
  base: "/",
  build: {
    outDir: "../public",
    emptyOutDir: false,
    assetsDir: "tv-react-assets",
    rollupOptions: { input: ["tv.html", "index.html"] },
  },
  publicDir: false,
  server: {
    port: 5174,
    strictPort: true,
    open: "/",
    // Desarrollo local: las consultas de lectura usan el proxy del dashboard existente.
    proxy: {
      // Leer los monitores directamente: no depende de proxies Bull publicados en Pages.
      "/api/core-failed": {
        target: "https://core-monitor.futura100.com.py", changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, "http://localhost");
          const query = new URLSearchParams({ activeQueue: "envioSifen", status: "failed", page: url.searchParams.get("page") || "1", jobsPerPage: "50" });
          return `/admin/trabajos/api/queues?${query}`;
        },
      },
      "/api/bull-failed": {
        target: "https://controller-monitor.futura100.com.py", changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, "http://localhost");
          const query = new URLSearchParams({ activeQueue: url.searchParams.get("queue") || "consultaDocumentoCore", status: "failed", page: url.searchParams.get("page") || "1", jobsPerPage: "50" });
          return `/admin/trabajos/api/queues?${query}`;
        },
      },
      "/api/bull-controller": { target: "https://controller-monitor.futura100.com.py", changeOrigin: true, rewrite: () => "/admin/trabajos/api/queues?page=1&jobsPerPage=10" },
      "/api/bull-core": { target: "https://core-monitor.futura100.com.py", changeOrigin: true, rewrite: () => "/admin/trabajos/api/queues?page=1&jobsPerPage=10" },
      "/api": { target: "https://main.dashboard-bepa.pages.dev", changeOrigin: true },
    },
  },
});
