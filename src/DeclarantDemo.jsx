import React, { useState, useEffect, useMemo } from "react";
import { C } from "./tokens.js";
import { Eyebrow, Btn, Mono, Section, Field, CircuitChip, Analyzing, DemoNote, useCountUp, grid } from "./ui.jsx";
import { dirOf } from "./lang.js";
import { mad, fmt, fmtInt } from "../shared/format.js";
import { INVOICES } from "../data/invoices.js";
import { TARIFF_NOTE } from "../shared/tariff.js";
import { enrichDeclaration } from "../shared/enrich.js";
import { historyFor } from "../data/history.js";

/* Re-run the SAME deterministic engine in the browser with a manual HS override
   — instant, offline-proof. Raw line fields survive on the enriched decl, so we
   reconstruct the extracted payload from it and let enrich recompute everything. */
function recompute(decl, hsOverrides) {
  const extracted = {
    header: decl.header,
    lines: (decl.lines || []).map((l) => ({
      raw_description: l.raw_description || l.description,
      quantity: l.quantity, unit: l.unit, unit_price: l.unit_price,
      line_total: l.line_total, declared_origin: l.declared_origin,
      gross_weight_kg: l.gross_weight_kg,
    })),
  };
  return enrichDeclaration(extracted, {
    coo_present: decl.coo_present,
    origin_country: decl.origin_country,
    importer_known: decl.importer_known,
    source: decl.source,
    hsOverrides,
    historyFor,
  });
}

const STEPS = [
  "Lecture de la facture",
  "Extraction des lignes & des parties",
  "Suggestion du code SH (10 chiffres)",
  "Calcul de la valeur en douane (CIF)",
  "Droits + TVA 20 % + TPI",
  "Contrôle des risques — circuit",
];

const DOC_LABEL = {
  facture: "Facture", colisage: "Liste de colisage",
  certificat_origine: "Certificat d'origine", bl: "Connaissement (BL)",
};

const SEV_STYLE = {
  high: { fg: "#7A2E22", bg: "#F2DAD5" },
  medium: { fg: "#8A5A12", bg: "#F4E9D2" },
  low: { fg: "#3A3D40", bg: "#ECE7DC" },
};

export function DeclarantDemo() {
  const [view, setView] = useState("reception");
  const [decl, setDecl] = useState(null);
  const [source, setSource] = useState(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState(null);

  async function run(text, sample) {
    if (!text || !text.trim()) return;
    setRawText(text); setSource(sample); setError(null); setView("analyzing");
    const t0 = Date.now();
    try {
      const res = await fetch("/api/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceText: text }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Échec de l'extraction (${res.status}).`);
      }
      const data = await res.json();
      const wait = Math.max(0, 2300 - (Date.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
      setDecl(data); setView("result");
    } catch (e) {
      setError(e && e.message ? e.message : "Échec de l'extraction.");
      setView("reception");
    }
  }

  if (view === "analyzing") return <Analyzing steps={STEPS} source={source} text={rawText} title="Lecture de la facture" note="L'IA structure la facture — codes SH, droits, TVA et risque sont calculés par du code déterministe." />;
  if (view === "result" && decl) return <Result decl={decl} onBack={() => setView("reception")} />;
  return <Reception onPick={run} error={error} />;
}

/* ------------------------------ réception ------------------------------- */
function Reception({ onPick, error }) {
  const [paste, setPaste] = useState("");
  return (
    <div style={{ animation: "coursFade .4s ease" }}>
      <Eyebrow>01 — Réception</Eyebrow>
      <h1 style={{ fontSize: 25, fontWeight: 600, color: C.ink, margin: "8px 0 6px", letterSpacing: "-0.02em" }}>
        Factures à dédouaner
      </h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, maxWidth: 600, lineHeight: 1.55 }}>
        Sélectionnez une facture pour lancer l'extraction, ou collez le texte d'une facture.
        L'IA lit la facture et la convertit en déclaration structurée — le classement SH, les droits et le contrôle du risque restent du code déterministe.
      </p>

      {error && (
        <div style={{ background: "#F2DAD5", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "11px 14px", marginBottom: 16, fontSize: 13, color: "#7A2E22" }}>
          {error}
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: C.paper }}>
        {INVOICES.map((r, i) => (
          <button key={r.id} onClick={() => onPick(r.body, r)} style={{
            display: "block", width: "100%", textAlign: "start", border: "none",
            borderTop: i ? `1px solid ${C.border}` : "none", background: "transparent",
            padding: "15px 18px", cursor: "pointer", transition: "background .14s ease",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.tint1)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: C.tint2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 600, color: C.navy }} dir={dirOf(r.sender)}>
                {r.sender.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }} dir={dirOf(r.sender)}>{r.sender}</span>
                  <Mono style={{ fontSize: 11, color: C.faint, whiteSpace: "nowrap" }}>{r.date}</Mono>
                </div>
                <div style={{ fontSize: 13, color: C.ink2, fontWeight: 500, margin: "2px 0 3px" }}>{r.subject}</div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir={dirOf(r.snippet)}>{r.snippet}</div>
              </div>
              <span style={{ color: C.faint, fontSize: 16, alignSelf: "center" }}>›</span>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, border: `1px solid ${C.border}`, borderRadius: 8, background: C.paper, padding: 18 }}>
        <Eyebrow color={C.muted}>Coller une facture</Eyebrow>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)}
          placeholder="Collez ici le texte brut d'une facture commerciale…" className="cours-scroll"
          style={{ width: "100%", minHeight: 92, marginTop: 10, resize: "vertical", border: `1px solid ${C.border}`, borderRadius: 7, padding: "11px 13px", fontFamily: "var(--sans)", fontSize: 13, color: C.ink, background: C.page, outline: "none", lineHeight: 1.55, boxSizing: "border-box" }} />
        <div style={{ marginTop: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <DemoNote>{TARIFF_NOTE}</DemoNote>
          <Btn disabled={!paste.trim()} onClick={() => onPick(paste.trim(), null)}>Extraire la déclaration</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- résultat ------------------------------- */
function Result({ decl: initialDecl, onBack }) {
  const [decl, setDecl] = useState(initialDecl);
  const [overrides, setOverrides] = useState({});
  const [openLine, setOpenLine] = useState(null);
  useEffect(() => { setDecl(initialDecl); setOverrides({}); setOpenLine(null); }, [initialDecl]);

  function reclassify(idx, code) {
    const next = { ...overrides };
    if (code == null) delete next[idx]; else next[idx] = code;
    setOverrides(next);
    setDecl(recompute(initialDecl, next));
    setOpenLine(null);
  }

  const totals = decl.totals;
  const header = decl.header || {};
  const seller = header.seller || {};
  const buyer = header.buyer || {};

  const [step, setStep] = useState(-1);
  useEffect(() => {
    setStep(-1); let s = -1;
    const tmr = setInterval(() => { s += 1; setStep(s); if (s >= 5) clearInterval(tmr); }, 240);
    return () => clearInterval(tmr);
  }, [initialDecl]);
  const shown = (n) => step >= n;
  const landedAnim = useCountUp(totals.landed_cost_mad, shown(2));

  const numero = useMemo(() => "DUM-2026-" + String(1000 + Math.floor((initialDecl.totals.landed_cost_mad % 9000))).padStart(5, "0"), [initialDecl]);
  const histConfirm = (decl.lines || []).filter((l) => l.history && (l.history.status === "consistent" || l.history.status === "high"));

  return (
    <div style={{ animation: "coursFade .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, margin: "0 0 18px" }}>
        <div>
          <Eyebrow>02 — Déclaration extraite</Eyebrow>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: C.ink, margin: "8px 0 4px", letterSpacing: "-0.02em" }} dir={dirOf(buyer.name || "")}>
            {buyer.name || "Importateur à confirmer"}
          </h1>
          <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>
            {seller.name ? `${seller.name} → ` : ""}{buyer.city || "Maroc"} · facture {header.invoice_no || "—"} · {decl.currency}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <CircuitChip circuit={decl.risk.circuit} big />
          <Btn variant="ghost" onClick={onBack}>← Autre facture</Btn>
        </div>
      </div>

      {/* 01 Parties */}
      <Section index="01" title="Parties & document" revealed={shown(0)}>
        <div style={grid(4)} className="tt-grid-2">
          <Field label="Exportateur" value={seller.name} autoDir missing={!seller.name} hint={seller.country} />
          <Field label="Importateur" value={buyer.name} autoDir missing={!buyer.name} hint={buyer.city} />
          <Field label="Incoterm" value={header.incoterm} mono missing={!header.incoterm} hint={header.incoterm_place} />
          <Field label="Origine déclarée" value={decl.origin_country} mono missing={!decl.origin_country} />
        </div>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["facture", "colisage", "certificat_origine", "bl"].map((d) => {
            const present = (decl.documents_present || []).includes(d);
            return (
              <span key={d} style={{
                fontSize: 11.5, fontWeight: 500, borderRadius: 6, padding: "4px 10px",
                display: "inline-flex", alignItems: "center", gap: 6,
                color: present ? "#2F5A43" : "#7A2E22", background: present ? "#DCE5DD" : "#F2DAD5",
              }}>
                <span>{present ? "✓" : "✕"}</span> {DOC_LABEL[d]}
              </span>
            );
          })}
        </div>
      </Section>

      {/* 02 Lignes & codes SH */}
      <Section index="02" title="Lignes & codes SH" revealed={shown(1)}
        right={<DemoNote style={{ marginInlineStart: "auto" }}>tarifs illustratifs</DemoNote>}>
        <div className="cours-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr>
                {["Désignation", "Code SH", "Valeur CIF", "Droit", "TVA", "Revient"].map((h, i) => (
                  <th key={h} style={{ textAlign: i > 1 ? "end" : "start", fontSize: 10, fontWeight: 600, fontFamily: "var(--mono)", color: C.faint, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0 12px 9px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decl.lines.map((l, i) => {
                const low = (l.confidence || 0) < 0.5;
                const isOpen = openLine === i;
                const pct = Math.round((l.confidence || 0) * 100);
                return (
                  <React.Fragment key={i}>
                  <tr style={{ borderTop: `1px solid ${C.border}`, background: isOpen ? C.tint1 : "transparent" }}>
                    <td style={{ padding: "11px 12px", maxWidth: 280 }}>
                      <div dir={dirOf(l.description)} style={{ fontSize: 13, color: C.ink, fontWeight: 500, lineHeight: 1.35 }}>{l.description}</div>
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{fmtInt(l.quantity)} {l.unit} · {l.hs_label_fr}</div>
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Mono style={{ fontSize: 12.5, color: C.navy }}>{l.hs_code}</Mono>
                        {l.manual_hs && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.navy, background: C.tint2, borderRadius: 4, padding: "1px 5px" }}>manuel</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                        <span style={{ width: 30, height: 4, borderRadius: 3, background: C.tint2, overflow: "hidden", display: "inline-block" }}>
                          <span style={{ display: "block", height: "100%", width: `${pct}%`, background: l.manual_hs ? C.navy : low ? "#C98A2B" : "#3F7A4E" }} />
                        </span>
                        <span style={{ fontSize: 10, color: low && !l.manual_hs ? "#8A5A12" : C.muted }}>{l.manual_hs ? "validé" : pct + "%" + (low ? " · à vérifier" : "")}</span>
                      </div>
                      <button onClick={() => setOpenLine(isOpen ? null : i)} style={{ marginTop: 5, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: 10.5, color: C.navy, fontFamily: "var(--sans)" }}>
                        {isOpen ? "▾ " : "▸ "}pourquoi / modifier{l.alternates && l.alternates.length ? ` (${l.alternates.length})` : ""}
                      </button>
                    </td>
                    <td style={{ textAlign: "end", padding: "11px 12px" }}><Mono style={{ fontSize: 12, color: C.ink2 }}>{fmt(l.cif_mad)}</Mono></td>
                    <td style={{ textAlign: "end", padding: "11px 12px" }}>
                      <Mono style={{ fontSize: 12, color: C.ink }}>{fmt(l.duty_mad)}</Mono>
                      <div style={{ fontSize: 10, color: C.faint }}>{l.duty} %</div>
                    </td>
                    <td style={{ textAlign: "end", padding: "11px 12px" }}><Mono style={{ fontSize: 12, color: C.ink2 }}>{fmt(l.vat_mad)}</Mono></td>
                    <td style={{ textAlign: "end", padding: "11px 12px" }}><Mono style={{ fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{fmt(l.landed_cost_mad)}</Mono></td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ background: C.page, padding: "13px 14px", borderTop: `1px solid ${C.border}` }}>
                        <HsExplain line={l} onPick={(code) => reclassify(i, code)} onReset={l.manual_hs ? () => reclassify(i, null) : null} />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 03 Valeur en douane */}
      <Section index="03" title="Valeur en douane & taxes" revealed={shown(2)}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }} className="tt-stack">
          <div style={{ background: C.navy, borderRadius: 8, padding: "16px 20px", color: "#FCFBF8", minWidth: 230, flex: "1 1 230px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9DB0C9" }}>Coût de revient dédouané</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <Mono style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em" }}>{fmtInt(landedAnim)}</Mono>
              <span style={{ fontSize: 14, color: "#9DB0C9" }}>MAD</span>
            </div>
            <div style={{ fontSize: 11, color: "#9DB0C9", marginTop: 6 }}>CIF + droits + TVA + TPI</div>
          </div>
          <div style={{ flex: "2 1 320px", display: "flex", alignItems: "center" }}>
            <div style={{ ...grid(4), width: "100%" }} className="tt-grid-2">
              <Field label="Valeur CIF" value={mad(totals.cif_mad)} mono />
              <Field label="Droits de douane" value={mad(totals.duty_mad)} mono accent />
              <Field label="TVA (20 %)" value={mad(totals.vat_mad)} mono />
              <Field label="TPI (0,25 %)" value={mad(totals.tpi_mad)} mono />
            </div>
          </div>
        </div>
      </Section>

      {/* 04 Risque */}
      <Section index="04" title="Contrôle des risques" revealed={shown(3)}
        tint={decl.risk.circuit === "vert" ? undefined : (decl.risk.circuit === "rouge" ? "#F2DAD5" : "#F4E9D2")}
        right={<CircuitChip circuit={decl.risk.circuit} />}>
        {histConfirm.length > 0 && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "#2F5A43", background: "#DCE5DD", border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", marginBottom: decl.risk.flags.length ? 8 : 0 }}>
            <span style={{ marginTop: 1 }}>✓</span>
            <span style={{ lineHeight: 1.45 }}>
              Valeurs cohérentes avec l'historique de l'importateur (<span dir={dirOf(histConfirm[0].history.importer || "")}>{histConfirm[0].history.importer}</span>) — {histConfirm.length} ligne(s) recoupée(s) sur ses dossiers passés.
            </span>
          </div>
        )}
        {decl.risk.flags.length === 0 ? (
          <p style={{ fontSize: 13, color: "#2F5A43", margin: 0 }}>Aucun signal de risque — mainlevée automatique attendue (circuit vert).</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {decl.risk.flags.map((f, i) => {
              const st = SEV_STYLE[f.severity] || SEV_STYLE.low;
              return (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink2, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: st.fg, background: st.bg, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap", marginTop: 1 }}>{f.code}</span>
                  <span dir={dirOf(f.message)} style={{ lineHeight: 1.45 }}>{f.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 05 DUM document */}
      <div style={{ opacity: shown(4) ? 1 : 0, transform: shown(4) ? "none" : "translateY(12px)", transition: "opacity .55s ease, transform .55s ease", marginTop: 20 }}>
        <DumDocument decl={decl} numero={numero} />
      </div>
    </div>
  );
}

/* ------------------- HS explainability + manual override ---------------- */
function HsExplain({ line, onPick, onReset }) {
  const alts = line.alternates || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: C.ink2 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: C.faint }}>Pourquoi ce code</span>
        <div style={{ marginTop: 3, lineHeight: 1.5 }}>
          {line.classification_reason || "—"}
          {line.priceBand ? ` · valeur attendue ${line.priceBand[0]}–${line.priceBand[1]} MAD/u` : ""}
        </div>
      </div>
      {alts.length > 0 && (
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>
            Autres codes possibles — cliquez pour reclasser
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {alts.map((a) => (
              <button key={a.code} onClick={() => onPick(a.code)} style={{
                textAlign: "start", border: `1px solid ${C.border2}`, background: C.paper,
                borderRadius: 7, padding: "8px 11px", cursor: "pointer", maxWidth: 260,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Mono style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>{a.code}</Mono>
                  <span style={{ fontSize: 10.5, color: C.ink2 }}>droit {a.duty} %</span>
                </div>
                <div dir={dirOf(a.fr)} style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{a.fr}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {onReset && (
        <button onClick={onReset} style={{ alignSelf: "flex-start", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: 11, color: C.navy, fontFamily: "var(--sans)" }}>
          ↺ rétablir la suggestion automatique
        </button>
      )}
      <DemoNote>Même moteur que le serveur — valeur en douane, droits et circuit recalculés instantanément.</DemoNote>
    </div>
  );
}

/* --------------------------- DUM serif document ------------------------- */
function DumDocument({ decl, numero }) {
  const totals = decl.totals;
  const header = decl.header || {};
  const buyer = header.buyer || {};
  const seller = header.seller || {};
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "30px 32px", fontFamily: "var(--serif)", color: C.ink, boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 17, fontWeight: 600, fontFamily: "var(--sans)", letterSpacing: "-0.02em" }}>Strait Systems</span>
            <span style={{ width: 8, height: 8, background: C.navy, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Déclaration assistée — pré-remplissage BADR</div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Déclaration Unique de Marchandises</div>
          <Mono style={{ fontSize: 12, color: C.navy }}>N° {numero} · projet</Mono>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 18 }} className="tt-grid-2">
        <DumMeta label="Importateur" value={buyer.name} dir={dirOf(buyer.name || "")} />
        <DumMeta label="Exportateur" value={seller.name ? `${seller.name} (${seller.country || "—"})` : "—"} />
        <DumMeta label="Régime" value="Mise à la consommation" />
        <DumMeta label="Origine / Incoterm" value={`${decl.origin_country || "—"} · ${header.incoterm || "—"}`} />
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border2}` }}>
            {["Code SH", "Désignation", "Valeur CIF", "Droits", "TVA"].map((h, i) => (
              <th key={h} style={{ textAlign: i > 1 ? "end" : "start", fontSize: 11, fontWeight: 600, fontFamily: "var(--sans)", color: C.muted, padding: "0 0 7px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {decl.lines.map((l, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "9px 0" }}><Mono style={{ fontSize: 12, color: C.navy }}>{l.hs_code}</Mono></td>
              <td style={{ padding: "9px 8px", fontSize: 13 }} dir={dirOf(l.description)}>{l.hs_label_fr}</td>
              <td style={{ textAlign: "end", padding: "9px 0" }}><Mono style={{ fontSize: 12, color: C.ink }}>{fmt(l.cif_mad)}</Mono></td>
              <td style={{ textAlign: "end", padding: "9px 0" }}><Mono style={{ fontSize: 12, color: C.ink }}>{fmt(l.duty_mad)}</Mono></td>
              <td style={{ textAlign: "end", padding: "9px 0" }}><Mono style={{ fontSize: 12, color: C.ink }}>{fmt(l.vat_mad)}</Mono></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: "13px 16px", background: C.navy, borderRadius: 8, color: "#FCFBF8" }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Total droits & taxes</span>
        <Mono style={{ fontSize: 21, fontWeight: 500 }}>{mad(totals.taxes_total_mad)}</Mono>
      </div>

      <div style={{ marginTop: 18, paddingTop: 15, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11.5, color: C.faint, fontFamily: "var(--sans)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Note</div>
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65, margin: 0 }}>
          Projet de déclaration généré à partir de la facture. Codes SH, valeur en douane (CIF), droits, TVA (20 %) et TPI calculés par du code déterministe sur une grille tarifaire de démonstration — à valider sur l'ADIL avant dépôt dans BADR. Aucune valeur n'est inventée par l'IA.
        </p>
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: C.faint, fontFamily: "var(--sans)", textAlign: "center" }}>Conçu par Strait Systems</div>
    </div>
  );
}

function DumMeta({ label, value, dir }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.faint, fontFamily: "var(--sans)" }}>{label}</div>
      <div style={{ fontSize: 14 }} dir={dir}>{value || "—"}</div>
    </div>
  );
}
