/* Script detection for per-fragment direction (mixed FR/AR content). */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/;
export const isArabic = (s) => ARABIC.test(s || "");
export const dirOf = (s) => (isArabic(s) ? "rtl" : "ltr");
