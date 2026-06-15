import React, { useState, useEffect } from "react";
import { C, CIRCUIT } from "./tokens.js";
import { Eyebrow, Mono, CircuitChip, useCountUp, DemoNote } from "./ui.jsx";
import { dirOf } from "./lang.js";
import { fmtInt, fmt } from "../shared/format.js";
import { SHIPMENTS, surestarieFor, REF_DATE, TIMELINE, computeBoardKpis } from "../data/shipments.js";
import { getTracked, subscribeTracked } from "./trackedStore.js";

const STATUS_LABEL = {
  en_route: "En route", arrivé: "Arrivé au port", sous_douane: "Sous douane",
  inspection: "Visite physique", dédouané: "Dédouané", livré: "Livré",
};
const PROGRESS = { en_route: 0, arrivé: 1, sous_douane: 2, inspection: 2, dédouané: 4, livré: 5 };
const MODE_LABEL = { mer: "Maritime", air: "Aérien", route: "Route" };

export function DashboardDemo() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [tracked, setTracked] = useState(getTracked());

  useEffect(() => subscribeTracked(setTracked), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/shipments")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setData(d); })
      .catch(() => {
        const shipments = SHIPMENTS.map((s) => ({ ...s, surestarie: surestarieFor(s) }));
        if (alive) setData({ ref_date: REF_DATE, kpis: computeBoardKpis(shipments), shipments });
      });
    return () => { alive = false; };
  }, []);

  if (!data) return <div style={{ padding: "60px 0", textAlign: "center", color: C.faint, fontSize: 13 }}>Chargement du tableau de bord…</div>;
  /* Merge dossiers tracked from the Déclarant (newest first) with the board;
     KPIs + savings banner recompute over the combined list. */
  const trackedShip = tracked.map((s) => ({ ...s, surestarie: surestarieFor(s) }));
  const shipments = [...trackedShip, ...data.shipments];
  const kpis = computeBoardKpis(shipments);

  return (
    <div style={{ animation: "coursFade .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <Eyebrow>Tableau de bord</Eyebrow>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: C.ink, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>Dédouanement en temps réel</h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>Dossiers Tanger Med · visibilité multi-acteurs · alertes surestaries</p>
        </div>
        <DemoNote>données synthétiques · réf. {data.ref_date}</DemoNote>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }} className="tt-grid-2">
        <Kpi label="Dossiers en cours" value={kpis.total} />
        <Kpi label="Circuit rouge" value={kpis.rouge} tone="rouge" />
        <Kpi label="Alertes surestaries" value={kpis.surestarieCount} tone={kpis.surestarieCount ? "rouge" : "vert"} />
        <Kpi label="Surestaries (MAD)" value={kpis.surestarieMad} money tone={kpis.surestarieMad ? "orange" : "vert"} />
      </div>

      {/* Money story — what the pre-fill saves, and what's bleeding if untouched */}
      <SavingsBanner kpis={kpis} />

      {/* Table */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: C.paper }}>
        <div className="cours-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ background: C.tint1 }}>
                {["Dossier", "Importateur", "Marchandise", "Origine", "Mode", "Circuit", "Statut", "Surestaries"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 7 ? "end" : "start", fontSize: 10.5, fontWeight: 600, fontFamily: "var(--mono)", color: C.muted, letterSpacing: "0.04em", textTransform: "uppercase", padding: "11px 14px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const isOpen = open === s.id;
                const sur = s.surestarie || { state: "n/a", amount: 0, daysLeft: null, overdueDays: 0 };
                return (
                  <React.Fragment key={s.id}>
                    <tr onClick={() => setOpen(isOpen ? null : s.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: isOpen ? C.tint1 : "transparent" }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Mono style={{ fontSize: 12.5, color: C.navy, fontWeight: 500 }}>{s.ref}</Mono>
                          {s.tracked && <span style={{ fontSize: 9, fontWeight: 600, color: "#2F5A43", background: "#DCE5DD", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.03em" }}>NOUVEAU</span>}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{s.hsCode}</div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12.5, color: C.ink, fontWeight: 500 }} dir={dirOf(s.importer)}>{s.importer}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted, maxWidth: 190 }} dir={dirOf(s.goods)}>{s.goods}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}><Mono style={{ color: C.ink2 }}>{s.origin}</Mono></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted }}>{MODE_LABEL[s.mode] || s.mode}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <CircuitChip circuit={s.circuit} />
                        <CircuitPrediction s={s} />
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.ink2 }}>{STATUS_LABEL[s.status] || s.status}</td>
                      <td style={{ padding: "11px 14px", textAlign: "end" }}><SurestarieCell sur={sur} daily={s.dailySurestarie} /></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={{ background: C.page, padding: "16px 18px", borderTop: `1px solid ${C.border}` }}>
                          <Timeline shipment={s} sur={sur} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SavingsBanner({ kpis }) {
  const hours = kpis.rekeyHoursSaved || 0;
  const exposure = kpis.dailyExposureMad || 0;
  const atRisk = kpis.atRiskCount || 0;
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }} className="tt-stack">
      <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 13, background: C.navy, borderRadius: 8, padding: "14px 18px", color: "#FCFBF8" }}>
        <Mono style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>≈ {fmtInt(hours)} h</Mono>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "#C9D4E4" }}>
          de ressaisie <span style={{ color: "#FCFBF8", fontWeight: 500 }}>BADR évitée</span><br />
          pré-remplissage IA sur {fmtInt(kpis.total)} dossiers
        </div>
      </div>
      <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 13, background: exposure ? "#F4E9D2" : "#DCE5DD", borderRadius: 8, padding: "14px 18px", border: `1px solid ${C.border}` }}>
        <Mono style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: exposure ? "#8A5A12" : "#3F7A4E" }}>{fmtInt(exposure)} <span style={{ fontSize: 14 }}>MAD/j</span></Mono>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, color: C.ink2 }}>
          de surestaries <span style={{ fontWeight: 500 }}>exposées</span> si non traitées<br />
          {fmtInt(atRisk)} dossier(s) à risque (franchise dépassée ou imminente)
        </div>
      </div>
      {kpis.undervaluationMad > 0 && (
        <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 13, background: "#F2DAD5", borderRadius: 8, padding: "14px 18px", border: "1px solid #E0B3A8" }}>
          <Mono style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "#7A2E22" }}>{fmtInt(kpis.undervaluationMad)} <span style={{ fontSize: 14 }}>MAD</span></Mono>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: C.ink2 }}>
            de <span style={{ fontWeight: 500 }}>droits & taxes sous-déclarés</span> détectés<br />
            {fmtInt(kpis.undervaluationCount)} dossier(s) — valeur vs historique importateur
          </div>
        </div>
      )}
      {kpis.predictionAccuracy != null && (
        <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 13, background: C.paper, borderRadius: 8, padding: "14px 18px", border: `1px solid ${C.border}` }}>
          <Mono style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: C.navy }}>{kpis.predictionAccuracy}%</Mono>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: C.ink2 }}>
            de <span style={{ fontWeight: 500 }}>prédictions BADR justes</span> ({kpis.predictionHits}/{kpis.predictionTotal} dossiers)<br />
            {kpis.predictionMisses} circuit(s) corrigé(s) après vérification
          </div>
        </div>
      )}
      {kpis.dataIssueCount > 0 && (
        <div style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 13, background: "#F4E9D2", borderRadius: 8, padding: "14px 18px", border: "1px solid #E6D3A8" }}>
          <Mono style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "#8A5A12" }}>{fmtInt(kpis.dataIssueTotal)}</Mono>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: C.ink2 }}>
            <span style={{ fontWeight: 500 }}>anomalies de saisie</span> détectées avant dépôt<br />
            {fmtInt(kpis.dataIssueCount)} dossier(s) — quantités, totaux, codes SH
          </div>
        </div>
      )}
    </div>
  );
}

/* Predicted-vs-actual marker under a circuit chip — the verify/override story
   made visible on the board. Amber when BADR contradicted our prediction. */
function CircuitPrediction({ s }) {
  if (!s.predictedCircuit) return null;
  const miss = s.predictedCircuit !== s.circuit;
  const predName = (CIRCUIT[s.predictedCircuit] || {}).label || s.predictedCircuit;
  if (miss) return <div style={{ fontSize: 10, color: "#8A5A12", marginTop: 3 }}>↺ prédit : {predName}</div>;
  return <div style={{ fontSize: 10, color: "#2F5A43", marginTop: 3 }}>{s.badrConfirmed ? "BADR ✓" : "✓ prédit juste"}</div>;
}

function Kpi({ label, value, money, tone }) {
  const v = useCountUp(Number(value) || 0, true, 800);
  const color = tone === "rouge" ? "#B23B2B" : tone === "orange" ? "#C98A2B" : tone === "vert" ? "#3F7A4E" : C.navy;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.paper, padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>{label}</div>
      <Mono style={{ fontSize: 26, fontWeight: 500, color }}>{money ? fmt(v, 0) : fmtInt(v)}</Mono>
    </div>
  );
}

function SurestarieCell({ sur, daily }) {
  if (sur.state === "overdue") return <span style={{ fontSize: 12, fontWeight: 600, color: "#7A2E22" }}>{fmtInt(sur.amount)} MAD <span style={{ fontWeight: 400, color: C.faint }}>· {sur.overdueDays}j</span></span>;
  if (sur.state === "soon") return <span style={{ fontSize: 12, color: "#8A5A12" }}>{sur.daysLeft}j restant · {fmtInt(daily)}/j</span>;
  if (sur.state === "ok") return <span style={{ fontSize: 12, color: C.muted }}>{sur.daysLeft}j francs</span>;
  return <span style={{ fontSize: 12, color: C.faint }}>—</span>;
}

function Timeline({ shipment, sur }) {
  const done = PROGRESS[shipment.status] != null ? PROGRESS[shipment.status] : 0;
  const isRed = shipment.circuit === "rouge";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap" }}>
        {TIMELINE.map((stp, i) => {
          const isDone = i < done;
          const isActive = i === done && shipment.status !== "livré";
          const danger = isActive && stp.key === "visite" && isRed;
          const col = danger ? "#B23B2B" : isDone ? C.navy : isActive ? C.navy : C.border2;
          return (
            <div key={stp.key} style={{ display: "flex", alignItems: "center", flex: i < TIMELINE.length - 1 ? "1 1 120px" : "0 0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 92 }}>
                <span style={{ width: 20, height: 20, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: isDone || isActive ? (danger ? "#F2DAD5" : C.navy) : "transparent", border: isDone || isActive ? "none" : `1.5px solid ${C.border2}` }}>
                  {isDone && <span style={{ color: "#FCFBF8", fontSize: 11 }}>✓</span>}
                  {isActive && <span style={{ width: 9, height: 9, borderRadius: 9, border: `1.5px solid ${danger ? "#B23B2B" : "#FCFBF8"}`, borderTopColor: "transparent", animation: "coursSpin .8s linear infinite" }} />}
                </span>
                <span style={{ fontSize: 11, color: isDone || isActive ? C.ink2 : C.faint, fontWeight: isActive ? 600 : 400, textAlign: "center", lineHeight: 1.3 }}>{stp.fr}</span>
              </div>
              {i < TIMELINE.length - 1 && <div style={{ flex: 1, height: 2, background: i < done ? C.navy : C.border, marginTop: -16, minWidth: 20 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, color: C.muted }}>
        <span>Fournisseur : <span style={{ color: C.ink2 }}>{shipment.supplier}</span></span>
        <span>ETA : <Mono style={{ color: C.ink2 }}>{shipment.eta}</Mono></span>
        {shipment.freeTimeEndsAt && <span>Franchise jusqu'au : <Mono style={{ color: C.ink2 }}>{shipment.freeTimeEndsAt}</Mono></span>}
        <span>Valeur déclarée : <Mono style={{ color: C.ink2 }}>{fmtInt(shipment.declaredValueMad)} MAD</Mono></span>
        {shipment.predictedCircuit && (() => {
          const ok = shipment.predictedCircuit === shipment.circuit;
          const lbl = (c) => (CIRCUIT[c] || {}).label || c;
          return (
            <span>Prédiction BADR : <span style={{ color: ok ? "#2F5A43" : "#8A5A12" }}>{lbl(shipment.predictedCircuit)}</span>
              {ok ? " · confirmée" : <> · corrigée → <span style={{ color: C.ink2 }}>{lbl(shipment.circuit)}</span></>}</span>
          );
        })()}
      </div>
      {shipment.riskFlags && shipment.riskFlags.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>
          {shipment.riskFlags.map((f, i) => (
            <span key={i} style={{ fontSize: 11.5, color: shipment.circuit === "rouge" ? "#7A2E22" : "#8A5A12", background: shipment.circuit === "rouge" ? "#F2DAD5" : "#F4E9D2", borderRadius: 6, padding: "4px 10px" }} dir={dirOf(f)}>{f}</span>
          ))}
        </div>
      )}
      {sur.state === "overdue" && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#7A2E22", fontWeight: 500 }}>
          ⚠ Surestaries en cours : {sur.overdueDays} jour(s) × {fmtInt(shipment.dailySurestarie)} MAD = {fmtInt(sur.amount)} MAD
        </div>
      )}
      {shipment.undervaluation && shipment.undervaluation.eluded_mad > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#7A2E22", fontWeight: 500 }}>
          ⚠ Sous-déclaration vs historique : écart ~{fmtInt(shipment.undervaluation.gap_mad)} MAD · droits & taxes éludés ~{fmtInt(shipment.undervaluation.eluded_mad)} MAD
        </div>
      )}
      {shipment.anomalies && shipment.anomalies.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, fontFamily: "var(--mono)", letterSpacing: "0.05em", textTransform: "uppercase", color: "#8A5A12", marginBottom: 6 }}>Contrôles de saisie · à corriger avant dépôt</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {shipment.anomalies.map((a, i) => (
              <span key={i} style={{ fontSize: 11.5, color: "#7A2E22", background: "#F2DAD5", borderRadius: 6, padding: "4px 10px" }} dir={dirOf(a.message || a.code)}>{a.message || a.code}</span>
            ))}
          </div>
        </div>
      )}
      <ShareImporter refId={shipment.ref} />
    </div>
  );
}

/* Read-only importer tracking link a transitaire copies/sends — the answer to
   the "c'est dédouané ?" phone calls. Opens the #/suivi/<ref> status page. */
function ShareImporter({ refId }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${window.location.pathname}#/suivi/${encodeURIComponent(refId)}`;
  const copy = (e) => {
    e.stopPropagation();
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10.5, fontFamily: "var(--mono)", letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 7 }}>Suivi importateur · lien lecture seule</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 11.5, color: C.ink2, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
        <button onClick={copy} style={{ border: `1px solid ${C.border2}`, background: C.paper, color: copied ? "#3F7A4E" : C.ink, borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 500 }}>{copied ? "✓ copié" : "⧉ Copier le lien"}</button>
        <a href={`#/suivi/${encodeURIComponent(refId)}`} onClick={(e) => e.stopPropagation()} style={{ border: `1px solid ${C.navy}`, background: C.navy, color: "#FCFBF8", borderRadius: 7, padding: "7px 12px", textDecoration: "none", fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 500 }}>Ouvrir ↗</a>
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>À envoyer à l'importateur (WhatsApp / e-mail) — il suit son dossier sans appeler.</div>
    </div>
  );
}
