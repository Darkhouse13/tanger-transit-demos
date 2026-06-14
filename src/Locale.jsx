import React, { createContext, useContext, useEffect, useState } from "react";
import { DIR } from "./i18n.js";
import { C } from "./tokens.js";

const LocaleContext = createContext({ locale: "fr", setLocale: () => {} });

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState("fr");
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIR[locale] || "ltr";
  }, [locale]);
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);

/* FR / العربية toggle — flips the whole UI to RTL via <html dir>. */
export function LangChip() {
  const { locale, setLocale } = useLocale();
  const opts = [["fr", "FR"], ["ar", "العربية"]];
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${C.border2}`, borderRadius: 8, overflow: "hidden" }}>
      {opts.map(([code, label]) => {
        const active = locale === code;
        return (
          <button
            key={code}
            onClick={() => setLocale(code)}
            style={{
              fontFamily: code === "ar" ? "var(--arabic)" : "var(--sans)",
              fontSize: 12.5, fontWeight: active ? 600 : 500, padding: "6px 12px",
              border: "none", cursor: "pointer",
              background: active ? C.navy : "transparent",
              color: active ? "#FCFBF8" : C.muted,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
