/* Design tokens — lifted from Cours (warm paper + navy instrument aesthetic). */
export const C = {
  page: "#F4F1EA", paper: "#FCFBF8", tint1: "#ECE7DC", tint2: "#E6E2D8",
  border: "#E4DECF", border2: "#D5CFBF",
  ink: "#14171A", ink2: "#3A3D40", muted: "#6F6F69", faint: "#9C9A91",
  navy: "#122541", navyDark: "#0A1A30",
};

/* Customs risk circuits (Vert / Orange / Rouge). */
export const CIRCUIT = {
  vert:   { label: "Vert",   ar: "أخضر",   fg: "#2F5A43", bg: "#DCE5DD", dot: "#3F7A4E" },
  orange: { label: "Orange", ar: "برتقالي", fg: "#8A5A12", bg: "#F4E9D2", dot: "#C98A2B" },
  rouge:  { label: "Rouge",  ar: "أحمر",   fg: "#7A2E22", bg: "#F2DAD5", dot: "#B23B2B" },
};

/* Generic status chip palette (board alerts). */
export const STATUS = {
  ok:     { label: "OK",      fg: "#2F5A43", bg: "#DCE5DD" },
  alerte: { label: "Alerte",  fg: "#7A2E22", bg: "#F2DAD5" },
  attente:{ label: "En cours",fg: "#9A6B1F", bg: "#F4E9D2" },
};
