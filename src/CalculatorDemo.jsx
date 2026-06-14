import React, { useState, useEffect } from "react";
import { C } from "./tokens.js";
import { Eyebrow, Mono, DemoNote, useCountUp } from "./ui.jsx";
import { useLocale } from "./Locale.jsx";
import { t } from "./i18n.js";
import { dirOf } from "./lang.js";
import { rankHs } from "../shared/classify.js";
import { computeLanded } from "../shared/landed.js";
import { mad, fmt } from "../shared/format.js";
import { TARIFF_NOTE } from "../shared/tariff.js";

const CURRENCIES = ["MAD", "EUR", "USD", "CNY", "TRY", "GBP"];

/* Same engine as the server — runs client-side for instant, offline-proof results. */
function classifyLocal(query, value, currency) {
  const ranked = rankHs(query, { topN: 3 });
  const v = Number(value) > 0 ? Number(value) : 10000;
  const candidates = ranked.candidates.map((c) => {
    const est = computeLanded([{ line_total: v, duty: c.duty, vat: c.vat, tpi: c.tpi }], { currency });
    return { ...c, landed: est.totals };
  });
  return { ...ranked, candidates, canonical: null };
}

export function CalculatorDemo() {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(50000);
  const [currency, setCurrency] = useState("MAD");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResult(null); return; }
    // Instant client-side result (deterministic, handles FR/AR).
    setResult(classifyLocal(query, value, currency));
    // Debounced server call: adds optional LLM canonicalization; ignored on failure.
    const id = setTimeout(async () => {
      try {
        const r = await fetch("/api/classify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, value: Number(value) || undefined, currency }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d && Array.isArray(d.candidates) && d.candidates.length) setResult(d);
        }
      } catch { /* keep client-side result */ }
    }, 320);
    return () => clearTimeout(id);
  }, [query, value, currency]);

  const top = result && result.candidates[0];
  const landedAnim = useCountUp(top ? top.landed.landed_cost_mad : 0, !!top, 700);

  return (
    <div style={{ animation: "coursFade .4s ease" }}>
      <Eyebrow>{t(locale, "nav_calc")}</Eyebrow>
      <h1 style={{ fontSize: 25, fontWeight: 600, color: C.ink, margin: "8px 0 6px", letterSpacing: "-0.02em" }}>{t(locale, "calc_title")}</h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, maxWidth: 620, lineHeight: 1.55 }}>{t(locale, "calc_lede")}</p>

      {/* Inputs */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.paper, padding: 18 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "calc_placeholder")}
          dir={dirOf(query)}
          style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "13px 15px",
            fontFamily: "var(--sans)", fontSize: 16, color: C.ink, background: C.page, outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: "1 1 160px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 5 }}>{t(locale, "calc_value")}</div>
            <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", fontFamily: "var(--mono)", fontSize: 14, color: C.ink, background: C.page, outline: "none", boxSizing: "border-box" }} />
          </label>
          <label>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 5 }}>{t(locale, "calc_currency")}</div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", fontFamily: "var(--mono)", fontSize: 14, color: C.ink, background: C.page, outline: "none", cursor: "pointer" }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <DemoNote style={{ marginInlineStart: "auto", paddingBottom: 9 }}>{TARIFF_NOTE}</DemoNote>
        </div>
      </div>

      {/* Results */}
      {result && (
        result.candidates.length === 0 ? (
          <div style={{ marginTop: 16, border: `1px dashed ${C.border2}`, borderRadius: 8, padding: "28px 20px", textAlign: "center", color: C.faint, fontSize: 13.5, background: C.paper }}>
            {t(locale, "calc_empty")}
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
              <Eyebrow color={C.muted}>{t(locale, "calc_candidates")}</Eyebrow>
              {result.canonical && <span style={{ fontSize: 11.5, color: C.faint }}>↳ {result.canonical}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.candidates.map((c, i) => {
                const primary = i === 0;
                const label = locale === "ar" ? c.ar : c.fr;
                const sub = locale === "ar" ? c.fr : c.en;
                const low = (c.confidence || 0) < 0.5;
                return (
                  <div key={c.code} style={{
                    border: `1px solid ${primary ? C.border2 : C.border}`, borderRadius: 8,
                    background: primary ? C.paper : C.paper, padding: "15px 17px",
                    boxShadow: primary ? "0 1px 0 rgba(0,0,0,0.02)" : "none",
                    display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
                  }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{c.code}</Mono>
                        {low && <span style={{ fontSize: 10.5, color: "#8A5A12", background: "#F4E9D2", borderRadius: 5, padding: "2px 7px" }}>{t(locale, "calc_review")}</span>}
                        {c.sensitive && <span style={{ fontSize: 10.5, color: "#7A2E22", background: "#F2DAD5", borderRadius: 5, padding: "2px 7px" }}>sensible</span>}
                      </div>
                      <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 500, marginTop: 4 }} dir={dirOf(label)}>{label}</div>
                      <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }} dir={dirOf(sub || "")}>{sub}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                        <span style={{ width: 54, height: 4, borderRadius: 3, background: C.tint2, overflow: "hidden", display: "inline-block" }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.round((c.confidence || 0) * 100)}%`, background: low ? "#C98A2B" : "#3F7A4E" }} />
                        </span>
                        <span style={{ fontSize: 10.5, color: C.muted }}>{Math.round((c.confidence || 0) * 100)}% {t(locale, "calc_confidence")}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                      <Stat label={t(locale, "calc_duty")} value={c.duty + " %"} accent />
                      <Stat label={t(locale, "calc_vat")} value={c.vat + " %"} />
                      <Stat label={t(locale, "calc_tpi")} value={c.tpi + " %"} />
                    </div>

                    <div style={{ marginInlineStart: "auto", textAlign: "end", minWidth: 150 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 3 }}>{t(locale, "calc_landed")}</div>
                      <Mono style={{ fontSize: primary ? 22 : 17, fontWeight: 600, color: C.navy }}>
                        {primary ? fmt(landedAnim) : fmt(c.landed.landed_cost_mad)}
                      </Mono>
                      <span style={{ fontSize: 12, color: C.muted }}> MAD</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 3 }}>{label}</div>
      <Mono style={{ fontSize: 14, fontWeight: 600, color: accent ? C.navy : C.ink2 }}>{value}</Mono>
    </div>
  );
}
