import React, { useState, useEffect } from "react";
import { C, CIRCUIT } from "./tokens.js";
import { fmtInt } from "../shared/format.js";
import { surestarieFor, REF_DATE, TIMELINE } from "../data/shipments.js";
import { getTracked } from "./trackedStore.js";

/* =====================================================================
   Importer-facing, read-only clearance status — the page a transitaire
   shares (link / QR) so the importer follows their dossier WITHOUT calling
   "c'est dédouané ?". Plain language, the live circuit, the free-time
   countdown, and the one thing expected of them. No login, no nav chrome.
   Reached via the #/suivi/<ref> hash route (works offline for board dossiers).
   ===================================================================== */

const STATUS_PUBLIC = {
  en_route: "En route vers Tanger Med",
  arrivé: "Arrivé au port",
  sous_douane: "En cours de dédouanement",
  inspection: "Visite physique en cours",
  dédouané: "Dédouané — prêt à enlever",
  livré: "Livré",
};
const PROGRESS = { en_route: 0, arrivé: 1, sous_douane: 2, inspection: 2, dédouané: 4, livré: 5 };
const CIRCUIT_PUBLIC = {
  vert: "Dédouanement fluide — mainlevée automatique attendue.",
  orange: "Contrôle documentaire en cours par la douane.",
  rouge: "Visite physique de la douane — un délai de 2 à 5 jours est possible.",
};

/* The single, deterministic "what's expected of you" line. */
function importerAction(s, sur) {
  if (s.status === "livré") return { tone: "ok", text: "Dossier livré et clôturé. Rien à faire." };
  if (s.status === "dédouané")
    return { tone: "ok", text: "Dédouané — prêt à enlever." + (s.freeTimeEndsAt ? ` Planifiez l'enlèvement avant le ${s.freeTimeEndsAt} pour éviter des surestaries.` : "") };
  if (s.circuit === "rouge" && s.status === "inspection")
    return { tone: "warn", text: "Visite physique de la douane en cours — aucune action de votre part. Nous vous tenons informé." };
  if (sur.state === "overdue")
    return { tone: "alert", text: `Surestaries en cours (${fmtInt(sur.amount)} MAD). Organisez l'enlèvement dès la mainlevée.` };
  if (sur.state === "soon")
    return { tone: "warn", text: `Franchise bientôt expirée${s.freeTimeEndsAt ? ` (jusqu'au ${s.freeTimeEndsAt})` : ""} — préparez l'enlèvement pour éviter des surestaries.` };
  if (s.status === "en_route")
    return { tone: "ok", text: `Marchandise en route — arrivée prévue le ${s.eta}. Rien requis pour l'instant.` };
  return { tone: "ok", text: "Dédouanement en cours — aucune action requise pour le moment." };
}

const TONE = {
  ok: { fg: "#2F5A43", bg: "#DCE5DD", bd: "#C7D6C8" },
  warn: { fg: "#8A5A12", bg: "#F4E9D2", bd: "#E6D3A8" },
  alert: { fg: "#7A2E22", bg: "#F2DAD5", bd: "#E0B3A8" },
};

export function ImporterStatus({ refId, onBack }) {
  const [dossier, setDossier] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let alive = true;
    const fromTracked = getTracked().find((d) => d.ref === refId);
    fetch("/api/shipments")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (alive) setDossier(fromTracked || (data.shipments || []).find((s) => s.ref === refId) || null); })
      .catch(() => { if (alive) setDossier(fromTracked || null); });
    return () => { alive = false; };
  }, [refId]);

  return (
    <div style={{ background: C.page, minHeight: "100vh", fontFamily: "var(--sans)", color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.paper }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", color: C.ink }}>Strait Systems</span>
            <span style={{ width: 8, height: 8, background: C.navy, borderRadius: 2, marginTop: 1 }} />
            <span style={{ marginInlineStart: 6, paddingInlineStart: 9, borderInlineStart: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>Suivi de dédouanement</span>
          </div>
          {onBack && (
            <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: C.navy, fontFamily: "var(--sans)" }}>↩ démo</button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "22px 20px 56px" }}>
        {dossier === undefined && <div style={{ padding: "60px 0", textAlign: "center", color: C.faint, fontSize: 13 }}>Chargement du suivi…</div>}
        {dossier === null && (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 10, padding: "26px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Dossier introuvable</div>
            <div style={{ fontSize: 13, color: C.muted }}>Le lien de suivi <Mono>{refId}</Mono> n'est pas (ou plus) disponible.</div>
          </div>
        )}
        {dossier && <StatusCard s={dossier} />}
      </main>
    </div>
  );
}

const Mono = ({ children, style }) => <span style={{ fontFamily: "var(--mono)", ...style }}>{children}</span>;

function StatusCard({ s }) {
  const sur = s.surestarie || surestarieFor(s);
  const cc = CIRCUIT[s.circuit] || CIRCUIT.vert;
  const action = importerAction(s, sur);
  const tone = TONE[action.tone];
  const done = PROGRESS[s.status] != null ? PROGRESS[s.status] : 0;

  return (
    <div style={{ animation: "coursFade .4s ease" }}>
      {/* dossier head */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: C.faint }}>Dossier</div>
          <Mono style={{ fontSize: 19, fontWeight: 600, color: C.navy }}>{s.ref}</Mono>
          <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 500, marginTop: 4 }}>{s.goods}</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>{s.importer}{s.supplier && s.supplier !== "—" ? ` · ${s.supplier}` : ""}{s.origin && s.origin !== "—" ? ` · origine ${s.origin}` : ""}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: cc.fg, background: cc.bg, borderRadius: 8, padding: "6px 12px", whiteSpace: "nowrap" }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: cc.dot }} /> Circuit {cc.label}
        </span>
      </div>

      {/* current status + meaning */}
      <div style={{ background: C.navy, borderRadius: 10, padding: "16px 18px", color: "#FCFBF8", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9DB0C9" }}>Statut actuel</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{STATUS_PUBLIC[s.status] || s.status}</div>
        <div style={{ fontSize: 12.5, color: "#C9D4E4", marginTop: 5, lineHeight: 1.5 }}>{CIRCUIT_PUBLIC[s.circuit]}</div>
      </div>

      {/* timeline */}
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: C.faint, marginBottom: 12 }}>Étapes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {TIMELINE.map((stp, i) => {
            const isDone = i < done;
            const isActive = i === done && s.status !== "livré";
            const danger = isActive && stp.key === "visite" && s.circuit === "rouge";
            return (
              <div key={stp.key} style={{ display: "flex", gap: 11, alignItems: "flex-start", minHeight: i < TIMELINE.length - 1 ? 34 : 22 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? C.navy : isActive ? (danger ? "#F2DAD5" : C.navy) : "transparent", border: isDone || isActive ? "none" : `1.5px solid ${C.border2}` }}>
                    {isDone && <span style={{ color: "#FCFBF8", fontSize: 10 }}>✓</span>}
                    {isActive && <span style={{ width: 8, height: 8, borderRadius: 8, border: `1.5px solid ${danger ? "#B23B2B" : "#FCFBF8"}`, borderTopColor: "transparent", animation: "coursSpin .8s linear infinite" }} />}
                  </span>
                  {i < TIMELINE.length - 1 && <span style={{ width: 2, flex: 1, background: i < done ? C.navy : C.border, minHeight: 14 }} />}
                </div>
                <span style={{ fontSize: 13, color: isDone || isActive ? C.ink2 : C.faint, fontWeight: isActive ? 600 : 400, paddingTop: 0 }}>{stp.fr}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* action expected */}
      <div style={{ background: tone.bg, border: `1px solid ${tone.bd}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: tone.fg, marginBottom: 4 }}>Ce qui est attendu de vous</div>
        <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}>{action.text}</div>
      </div>

      {/* free-time / surestaries */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <Stat label="Arrivée / ETA" value={s.eta || "—"} />
        {s.freeTimeEndsAt && <Stat label="Fin de franchise" value={s.freeTimeEndsAt} tone={sur.state === "overdue" ? "alert" : sur.state === "soon" ? "warn" : "ok"} />}
        <Stat label="Surestaries" value={sur.state === "overdue" ? `${fmtInt(sur.amount)} MAD` : sur.state === "soon" ? `${sur.daysLeft} j restant` : sur.state === "ok" ? `${sur.daysLeft} j francs` : "—"} tone={sur.state === "overdue" ? "alert" : sur.state === "soon" ? "warn" : "ok"} />
      </div>

      <div style={{ fontSize: 11.5, color: C.faint, textAlign: "center", lineHeight: 1.6 }}>
        Page en lecture seule — à jour au {REF_DATE}.<br />
        Suivi assuré par votre transitaire via Strait Systems · données de démonstration.
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const col = tone === "alert" ? "#7A2E22" : tone === "warn" ? "#8A5A12" : C.ink;
  return (
    <div style={{ flex: "1 1 150px", background: C.paper, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 13px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint }}>{label}</div>
      <Mono style={{ fontSize: 14, fontWeight: 600, color: col, marginTop: 3, display: "block" }}>{value}</Mono>
    </div>
  );
}
