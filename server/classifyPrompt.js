/* =====================================================================
   Strait Systems — demo 2 canonicalization prompt (tiny, optional).
   Translates/normalizes a short FR/EN/AR product description so the
   deterministic classifier can match it. Does NOT output an HS code.
   If DeepSeek is unavailable, the server falls back to raw keyword search.
   ===================================================================== */

export const CLASSIFY_SYSTEM_PROMPT = `You normalize a short product description (French, English, or Arabic) for Moroccan customs HS classification. Output JSON only - no prose, no markdown. Schema: {canonical: string, material_hints: string[], lang: "fr"|"ar"|"en"}. Put in "canonical" a concise French product term (translate Arabic/English). "material_hints": lowercase French materials/keywords (e.g. ["coton"], ["acier"]). Detect the input language in "lang". Do NOT output an HS code or any number. Output the JSON object only.`;
