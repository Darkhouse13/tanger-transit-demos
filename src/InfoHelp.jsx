import React, { useState, useEffect } from "react";
import { C } from "./tokens.js";
import { HELP } from "./helpContent.js";

export function InfoHelp({ tab }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const page = HELP[tab] || HELP.declarant;
  const blocks = [HELP.global, page];

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Informations & hypothèses" title="Informations & hypothèses"
        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border2}`, background: C.paper, color: C.navy, cursor: "pointer", fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        ⓘ
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10,16,24,0.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 18px", animation: "coursFade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} className="cours-scroll" style={{ background: C.page, border: `1px solid ${C.border2}`, borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "82vh", overflow: "auto", boxShadow: "0 18px 50px rgba(0,0,0,0.22)" }}>
            <div style={{ position: "sticky", top: 0, background: C.page, borderBottom: `1px solid ${C.border}`, padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint }}>Informations & hypothèses</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 2 }}>{page.title}</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: C.muted, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "8px 22px 22px" }}>
              {blocks.map((b, bi) => (
                <div key={bi} style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.ink2, marginBottom: 8 }}>{b.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {b.items.map(([h, body], i) => (
                      <div key={i} style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{h}</div>
                        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 3 }}>{body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.faint, marginTop: 18, textAlign: "center" }}>Tarifs et chiffres illustratifs — démonstration · Strait Systems</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
