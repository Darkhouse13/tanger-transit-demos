import React, { useState, useEffect } from "react";
import { C, CIRCUIT } from "./tokens.js";
import { dirOf } from "./lang.js";

export const grid = (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "16px 22px" });

/* ------------------------------ count-up -------------------------------- */
export function useCountUp(target, run, dur = 950) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run || !target) { setV(target || 0); return; }
    let raf, start;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

/* ------------------------------ primitives ------------------------------ */
export const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "var(--mono)", ...style }}>{children}</span>
);

export const Eyebrow = ({ children, color }) => (
  <div style={{
    fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.09em",
    textTransform: "uppercase", color: color || C.faint,
  }}>{children}</div>
);

export function Btn({ children, onClick, variant = "primary", disabled, style }) {
  const base = {
    fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 500, padding: "10px 18px",
    borderRadius: 8, cursor: disabled ? "default" : "pointer", transition: "all .16s ease",
    border: "1px solid transparent", letterSpacing: "-0.005em", ...style,
  };
  const skin = variant === "primary"
    ? { background: disabled ? C.border2 : C.navy, color: disabled ? C.paper : "#FCFBF8" }
    : variant === "ghost"
    ? { background: "transparent", color: C.ink2, border: `1px solid ${C.border2}` }
    : { background: C.paper, color: C.ink, border: `1px solid ${C.border2}` };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...skin }}
      onMouseEnter={(e) => { if (!disabled && variant === "primary") e.currentTarget.style.background = C.navyDark; }}
      onMouseLeave={(e) => { if (!disabled && variant === "primary") e.currentTarget.style.background = C.navy; }}
    >
      {children}
    </button>
  );
}

export function AConfirmer({ label = "à confirmer" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500,
      color: "#9A6B1F", background: "#F4E9D2", borderRadius: 6, padding: "3px 9px", fontFamily: "var(--sans)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 5, background: "#9A6B1F" }} />
      {label}
    </span>
  );
}

/* --------------------------- circuit chip ------------------------------- */
export function CircuitChip({ circuit, big }) {
  const s = CIRCUIT[circuit] || CIRCUIT.vert;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontFamily: "var(--sans)", fontSize: big ? 13.5 : 11.5, fontWeight: 600,
      color: s.fg, background: s.bg, borderRadius: big ? 8 : 6,
      padding: big ? "6px 13px" : "4px 10px",
    }}>
      <span style={{ width: big ? 8 : 6, height: big ? 8 : 6, borderRadius: 8, background: s.dot }} />
      Circuit {s.label}
    </span>
  );
}

/* ------------------------------ section --------------------------------- */
export function Section({ index, title, revealed = true, children, tint, right }) {
  return (
    <div style={{
      opacity: revealed ? 1 : 0,
      transform: revealed ? "none" : "translateY(12px)",
      transition: "opacity .55s ease, transform .55s ease",
      background: tint || C.paper, border: `1px solid ${tint ? C.border2 : C.border}`,
      borderRadius: 8, padding: "17px 19px", marginBottom: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        {index && <Mono style={{ fontSize: 10.5, color: C.navy }}>{index}</Mono>}
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.ink2 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: tint ? C.border2 : C.border }} />
        {right}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------- field ---------------------------------- */
export function Field({ label, value, missing, mono, hint, accent, autoDir }) {
  const dir = autoDir && typeof value === "string" ? dirOf(value) : undefined;
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: C.faint, marginBottom: 5 }}>{label}</div>
      {missing ? <AConfirmer /> : (
        <div dir={dir} style={{
          fontSize: 14, color: accent ? C.navy : C.ink,
          fontFamily: mono ? "var(--mono)" : "var(--sans)",
          fontWeight: accent ? 600 : 500, lineHeight: 1.4,
        }}>{value}</div>
      )}
      {hint && !missing && <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

/* ------------------------ illustrative-data note ------------------------ */
export function DemoNote({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: C.faint, fontFamily: "var(--sans)", display: "inline-flex",
      alignItems: "center", gap: 6, ...style,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 4, background: C.faint }} />
      {children}
    </div>
  );
}

/* ----------------------- analysing checklist ---------------------------- */
export function Analyzing({ steps, source, text, title = "Lecture de la facture", note }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const tmr = setInterval(() => setStep((s) => Math.min(s + 1, steps.length)), 360);
    return () => clearInterval(tmr);
  }, []);
  return (
    <div style={{ animation: "coursFade .35s ease", maxWidth: 720, margin: "0 auto" }}>
      <Eyebrow color={C.navy}>Analyse en cours</Eyebrow>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: C.ink, margin: "8px 0 18px", letterSpacing: "-0.02em" }}>{title}</h1>

      {(source || text) && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.paper, overflow: "hidden", marginBottom: 16 }}>
          {source && (
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${C.border}`, background: C.tint1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{source.subject}</div>
              <Mono style={{ fontSize: 11, color: C.muted }}>{source.sender} · {source.email}</Mono>
            </div>
          )}
          <pre className="cours-scroll" style={{
            margin: 0, padding: "13px 15px", maxHeight: 150, overflow: "auto",
            fontFamily: "var(--sans)", fontSize: 12, color: C.muted, lineHeight: 1.55, whiteSpace: "pre-wrap",
          }}>{text}</pre>
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.paper, padding: "6px 16px" }}>
        {steps.map((label, i) => {
          const done = step > i, active = step === i;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <span style={{
                width: 17, height: 17, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? C.navy : "transparent", border: done ? "none" : `1.5px solid ${active ? C.navy : C.border2}`,
              }}>
                {done && <span style={{ color: "#FCFBF8", fontSize: 10, lineHeight: 1 }}>✓</span>}
                {active && <span style={{ width: 8, height: 8, border: `1.5px solid ${C.navy}`, borderTopColor: "transparent", borderRadius: 8, animation: "coursSpin .7s linear infinite" }} />}
              </span>
              <span style={{ fontSize: 13, color: done ? C.ink2 : active ? C.ink : C.faint, fontWeight: active ? 500 : 400 }}>{label}</span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11.5, color: C.faint, marginTop: 13, textAlign: "center" }}>
        {note || "L'IA structure la facture — le chiffrage qui suit est calculé par du code déterministe."}
      </p>
    </div>
  );
}
