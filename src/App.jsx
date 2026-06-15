import React, { useState, useEffect } from "react";
import { C } from "./tokens.js";
import { useLocale, LangChip } from "./Locale.jsx";
import { t } from "./i18n.js";
import { InfoHelp } from "./InfoHelp.jsx";
import { DeclarantDemo } from "./DeclarantDemo.jsx";
import { CalculatorDemo } from "./CalculatorDemo.jsx";
import { DashboardDemo } from "./DashboardDemo.jsx";
import { ImporterStatus } from "./ImporterStatus.jsx";

/* Importer status-share route: #/suivi/<ref> renders the standalone, read-only
   tracking page (no demo nav) — the link a transitaire sends the importer. */
function parseHash() {
  const m = (window.location.hash || "").match(/^#\/suivi\/(.+)$/);
  return m ? { name: "suivi", ref: decodeURIComponent(m[1]) } : null;
}

export default function App() {
  const { locale } = useLocale();
  const [tab, setTab] = useState("declarant");
  const [route, setRoute] = useState(() => parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route && route.name === "suivi") {
    return <ImporterStatus refId={route.ref} onBack={() => { window.location.hash = ""; }} />;
  }

  const tabs = [
    { key: "declarant", n: 1, label: t(locale, "nav_declarant"), sub: t(locale, "sub_declarant") },
    { key: "calc", n: 2, label: t(locale, "nav_calc"), sub: t(locale, "sub_calc") },
    { key: "board", n: 3, label: t(locale, "nav_board"), sub: t(locale, "sub_board") },
  ];

  return (
    <div style={{ background: C.page, minHeight: "100vh", fontFamily: "var(--sans)", color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.paper, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 22px", minHeight: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0" }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: C.ink, fontFamily: "var(--sans)" }}>Strait Systems</span>
            <span style={{ width: 9, height: 9, background: C.navy, borderRadius: 2, marginTop: 2 }} />
            <span style={{ marginInlineStart: 6, paddingInlineStart: 10, borderInlineStart: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
              Transit · Tanger Med
            </span>
          </div>

          {/* Switcher */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {tabs.map((s) => {
              const active = tab === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setTab(s.key)}
                  title={s.sub}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
                    border: "none", background: active ? C.tint1 : "transparent", cursor: "pointer",
                    fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: active ? 600 : 500,
                    color: active ? C.ink : C.muted,
                  }}
                >
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10, width: 17, height: 17, borderRadius: 5,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: active ? C.navy : C.tint2, color: active ? "#FCFBF8" : C.muted,
                  }}>{s.n}</span>
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <InfoHelp tab={tab} />
            <LangChip />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 22px 48px" }}>
        {tab === "declarant" && <DeclarantDemo onNavigate={setTab} />}
        {tab === "calc" && <CalculatorDemo />}
        {tab === "board" && <DashboardDemo />}
      </main>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "16px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 11.5, color: C.faint }}>
          {t(locale, "brand_tagline")} · <span style={{ color: C.muted }}>{t(locale, "footer")}</span>
        </div>
      </footer>
    </div>
  );
}
