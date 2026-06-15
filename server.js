import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { EXTRACT_SYSTEM_PROMPT } from "./server/extractPrompt.js";
import { CLASSIFY_SYSTEM_PROMPT } from "./server/classifyPrompt.js";
import { callDeepSeek } from "./server/deepseek.js";
import { enrichDeclaration } from "./shared/enrich.js";
import { rankHs } from "./shared/classify.js";
import { computeLanded } from "./shared/landed.js";
import { matchInvoice } from "./data/invoices.js";
import { historyFor } from "./data/history.js";
import { SHIPMENTS, surestarieFor, REF_DATE, computeBoardKpis } from "./data/shipments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const OFFLINE = process.env.DEMO_OFFLINE === "1";
const INVOICE_TEXT_LIMIT_BYTES = 24 * 1024;
const QUERY_LIMIT_BYTES = 2 * 1024;

const app = Fastify({
  logger: false,
  trustProxy: true,
  bodyLimit: 64 * 1024,
});

await app.register(rateLimit, { global: false });

app.setErrorHandler((error, _request, reply) => {
  if (process.env.NODE_ENV !== "production") console.error("[error]", error && error.stack ? error.stack : error);
  if (error.statusCode === 413) {
    reply.code(413).send({ error: "Requête trop volumineuse." });
    return;
  }
  if (error.statusCode === 429) {
    reply.code(429).send({ error: "Trop de requêtes — réessayez dans un instant." });
    return;
  }
  const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
  reply.code(status).send({ error: "La requête a échoué." });
});

app.get("/healthz", async (_request, reply) => {
  reply.code(200).send("ok");
});

/* ============== DEMO 1 — AI Déclarant : extract + enrich ============== */
app.post(
  "/api/extract",
  { bodyLimit: 64 * 1024, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
  async (request, reply) => {
    const invoiceText = request.body && request.body.invoiceText;
    if (typeof invoiceText !== "string" || !invoiceText.trim()) {
      reply.code(400).send({ error: "invoiceText requis." });
      return;
    }
    if (Buffer.byteLength(invoiceText, "utf8") > INVOICE_TEXT_LIMIT_BYTES) {
      reply.code(413).send({ error: "Facture trop volumineuse." });
      return;
    }

    /* Known sample invoices are extracted from canned structure — instant,
       deterministic, and works with no API key (offline demo safety net).
       Free-text paste uses the live LLM extractor. */
    const match = matchInvoice(invoiceText);
    try {
      let extracted, meta;
      if (match) {
        extracted = match.extracted;
        meta = { ...match.meta, source: OFFLINE ? "exemple (hors-ligne)" : "exemple" };
      } else if (OFFLINE || !process.env.DEEPSEEK_API_KEY) {
        reply.code(422).send({
          error: "Mode démonstration hors-ligne : sélectionnez une facture d'exemple (l'extraction IA d'un texte libre nécessite une clé API).",
        });
        return;
      } else {
        extracted = await callDeepSeek(EXTRACT_SYSTEM_PROMPT, invoiceText, { maxTokens: 1500 });
        meta = { source: "live" };
      }
      reply.send(enrichDeclaration(extracted, { ...meta, historyFor }));
    } catch (e) {
      const msg = (e && e.message) || "";
      console.error("[extract] échec :", msg); // visible dans le terminal `npm start`
      let clientMsg = "Le service d'extraction est indisponible.";
      if (/no_api_key/.test(msg)) clientMsg = "Clé DeepSeek absente côté serveur.";
      else if (/upstream_failed:(401|403)/.test(msg)) clientMsg = "Clé DeepSeek invalide ou expirée.";
      else if (/upstream_failed:402/.test(msg)) clientMsg = "Solde DeepSeek insuffisant — créditez le compte DeepSeek.";
      else if (/upstream_failed:429/.test(msg)) clientMsg = "Trop de requêtes DeepSeek — réessayez dans un instant.";
      else if (/timeout|aborted|fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(msg)) clientMsg = "Service DeepSeek injoignable (réseau ou délai dépassé).";
      else if (/parser|JSON/i.test(msg)) clientMsg = "Réponse d'extraction illisible — réessayez.";
      reply.code(502).send({ error: clientMsg });
    }
  }
);

/* ============ DEMO 2 — Calculatrice : classify + landed cost ========== */
app.post(
  "/api/classify",
  { bodyLimit: 8 * 1024, config: { rateLimit: { max: 40, timeWindow: "1 minute" } } },
  async (request, reply) => {
    const body = request.body || {};
    const query = body.query;
    if (typeof query !== "string" || !query.trim()) {
      reply.code(400).send({ error: "query requis." });
      return;
    }
    if (Buffer.byteLength(query, "utf8") > QUERY_LIMIT_BYTES) {
      reply.code(413).send({ error: "Requête trop longue." });
      return;
    }

    const currency = typeof body.currency === "string" ? body.currency : "MAD";
    const value = Number(body.value) > 0 ? Number(body.value) : 10000;

    /* Optional LLM canonicalization (translate/normalize). Safe fallback to
       raw keyword matching — the classifier already understands FR/AR/EN. */
    let searchText = query;
    let canonical = null;
    if (!OFFLINE && process.env.DEEPSEEK_API_KEY) {
      try {
        const c = await callDeepSeek(CLASSIFY_SYSTEM_PROMPT, query, { maxTokens: 120 });
        if (c && typeof c.canonical === "string" && c.canonical.trim()) {
          canonical = c.canonical.trim();
          const hints = Array.isArray(c.material_hints) ? c.material_hints.join(" ") : "";
          searchText = `${query} ${canonical} ${hints}`;
        }
      } catch { /* ignore — keyword fallback */ }
    }

    const ranked = rankHs(searchText, { topN: 3 });
    const candidates = ranked.candidates.map((c) => {
      const est = computeLanded(
        [{ line_total: value, duty: c.duty, vat: c.vat, tpi: c.tpi }],
        { currency }
      );
      return { ...c, landed: est.totals };
    });

    reply.send({ query, canonical, currency, value, ...ranked, candidates });
  }
);

/* ================ DEMO 3 — Tableau de bord : shipments =============== */
app.get(
  "/api/shipments",
  { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
  async (_request, reply) => {
    const shipments = SHIPMENTS.map((s) => ({ ...s, surestarie: surestarieFor(s) }));
    reply.send({ ref_date: REF_DATE, kpis: computeBoardKpis(shipments), shipments });
  }
);

await app.register(fastifyStatic, { root: distDir, prefix: "/" });

app.setNotFoundHandler((request, reply) => {
  if (request.method === "GET" && !request.url.startsWith("/api/")) {
    reply.sendFile("index.html");
    return;
  }
  reply.code(404).send({ error: "Not found." });
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[server] à l'écoute sur http://localhost:${PORT}${OFFLINE ? " (DEMO_OFFLINE)" : ""}`);
} catch (e) {
  const msg = (e && e.message) || String(e);
  if (/EADDRINUSE/.test(msg)) console.error(`[server] le port ${PORT} est déjà utilisé — fermez l'autre serveur ou changez PORT.`);
  else console.error(`[server] démarrage impossible sur le port ${PORT} :`, msg);
  process.exit(1);
}
