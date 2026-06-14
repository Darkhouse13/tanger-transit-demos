import React, { useState, useEffect } from "react";
import { C } from "./tokens.js";
import { Eyebrow, Mono, CircuitChip, useCountUp, DemoNote } from "./ui.jsx";
import { dirOf } from "./lang.js";
import { fmtInt, fmt } from "../shared/format.js";
import { SHIPMENTS, surestarieFor, REF_DATE, TIMELINE } from "../data/shipments.js";

const STATUS_LABEL = {
  en_route: "En route", arrivé: "Arrivé au port", sous_douane: "Sous douane",
  inspection: "Visite physique", dédouané: "Dédouané", livré: "Livré",
};
const PROGRESS = { en_route: 0, arrivé: 1, sous_douane: 2, inspection: 2, dédouané: 4, livré: 5 };
const MODE_LABEL = { mer: "Maritime", air: "Aérien", route: "Route" };

function computeKpis(shipments) {
  return {
    total: shipments.length,
    vert: shipments.filter((s) => s.circuit === "vert").length,
    orange: shipments.filter((s) => s.circuit === "orange").length,
    rouge: shipments.filter((s) => s.circuit === "rouge").length,
    surestarieMad: shipments.reduce((sum, s) => sum + (s.surestarie?.amount || 0), 0),
    surestarieCount: shipments.filter((s) => s.surestarie?.state === "overdue").length,
  };
}

export function DashboardDemo() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/shipments")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setData(d); })
      .catch(() => {
        const shipments = SHIPMENTS.map((s) => ({ ...s, surestarie: surestarieFor(s) }));
        if (alive) setData({ ref_date: REF_DATE, kpis: computeKpis(shipments), shipments });
      });
    return () => { alive = false; };
  }, []);

  if (!data) return <div style={{ padding: "60px 0", textAlign: "center", color: C.faint, fontSize: 13 }}>Chargement du tableau de bord…</div>;
  const { kpis, shipments } = data;

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
                        <Mono style={{ fontSize: 12.5, color: C.navy, fontWeight: 500 }}>{s.ref}</Mono>
                        <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{s.hsCode}</div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12.5, color: C.ink, fontWeight: 500 }} dir={dirOf(s.importer)}>{s.importer}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted, maxWidth: 190 }} dir={dirOf(s.goods)}>{s.goods}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12 }}><Mono style={{ color: C.ink2 }}>{s.origin}</Mono></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted }}>{MODE_LABEL[s.mode] || s.mode}</td>
                      <td style={{ padding: "11px 14px" }}><CircuitChip circuit={s.circuit} /></td>
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
    </div>
  );
}
