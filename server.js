const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_API = "https://ouelrddwbmqwabnviyro.supabase.co/functions/v1/api";

app.use(express.json({ limit: "2mb" }));

app.all("/api/*", async (req, res) => {
  try {
    const suffix = req.originalUrl.slice(4);
    const headers = { "content-type": "application/json" };
    if (req.headers.cookie) headers.cookie = req.headers.cookie;

    const init = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      init.body = JSON.stringify(req.body ?? {});
    }

    const upstream = await fetch(SUPABASE_API + suffix, init);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("set-cookie", setCookie);
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "No se pudo conectar con el backend Palau" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
    }
  }
}));
app.get("*", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log("Palau Ventas escuchando en", PORT));
