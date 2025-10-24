// apiClient.js

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}
function cleanBaseUrl(raw) { return (raw || "").replace(/\/+$/, ""); }
function headerAuth() {
  const headers = {};
  if (typeof API_KEY !== "undefined" && API_KEY && API_KEY.trim()) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  return headers;
}

/** OLS4 SEARCH */
async function searchOLS4(label, { size = 25, start = 0, ontology, lang = "en" } = {}) {
  const base = cleanBaseUrl(USE_PROXY ? PROXY_URL : API_BASE_URL);
  const url = `${base}/api/search?${buildQuery({ q: label, size, start, lang, ontology })}`;
  const res = await fetch(url, { headers: headerAuth() });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} – ${await res.text()}`);
  return res.json();
}

/** OLS4 TERMS (by IRI) */
async function fetchTermByIRI(iri, { lang = "en" } = {}) {
  const base = cleanBaseUrl(USE_PROXY ? PROXY_URL : API_BASE_URL);
  const iriEnc = encodeURIComponent(iri);
  const url = `${base}/api/terms?${buildQuery({ iri: iriEnc, lang })}`;
  const res = await fetch(url, { headers: headerAuth() });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} – ${await res.text()}`);
  return res.json();
}

/** OLS4 INDIVIDUALS (id lookups) */
async function getIndividuals({ iri, short_form, obo_id, lang = "en", size, page } = {}) {
  const base = cleanBaseUrl(USE_PROXY ? PROXY_URL : API_BASE_URL);
  const url = `${base}/api/individuals`;
  const encodedIri = iri ? encodeURIComponent(iri) : undefined;
  const query = buildQuery({ iri: encodedIri, short_form, obo_id, lang, size, page });
  const res = await fetch(`${url}?${query}`, { headers: headerAuth() });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} – ${await res.text()}`);
  return res.json();
}

/** Normalizers */
function ontologyPrefixOf(doc) { return String(doc.ontology_prefix || doc.ontology_name || "").toUpperCase(); }
function ontologyIdOf(doc) {
  if (doc.obo_id) return String(doc.obo_id);
  if (doc.short_form) return String(doc.short_form);
  if (doc.iri) return String(doc.iri).split("/").pop();
  return "";
}
function descFrom(doc) {
  if (Array.isArray(doc.description) && doc.description[0]) return doc.description[0];
  if (typeof doc.description === "string") return doc.description;
  return "";
}

/** Ensure a description exists using /api/terms if needed */
async function ensureDescription(doc, { lang = "en" } = {}) {
  let desc = descFrom(doc);
  if (desc && desc.trim()) return desc;
  if (!doc.iri) return "";
  try {
    const data = await fetchTermByIRI(doc.iri, { lang });
    const terms = (data._embedded && data._embedded.terms) || [];
    const d = terms[0]?.description;
    if (Array.isArray(d) && d[0]) return d[0];
    if (typeof d === "string") return d;
  } catch {}
  return "";
}

/** Scoring + tie-break for best concept */
function scoreDoc(d, target) {
  const lbl = String(d.label || "");
  const exact = lbl.toLowerCase() === String(target).toLowerCase();
  const onto = ontologyPrefixOf(d);
  const isCL = onto === "CL";
  const isGO = onto === "GO";
  const isNCIT = onto === "NCIT";
  const notObs = d.is_obsolete ? 0 : 1;
  return (exact ? 20 : 0) + (isCL ? 5 : 0) + (isGO ? 4 : 0) + (isNCIT ? 3 : 0) + notObs;
}
function better(a, b, target, descA, descB) {
  if (!b) return true;
  const sa = scoreDoc(a, target), sb = scoreDoc(b, target);
  if (sa !== sb) return sa > sb;
  const la = (descA || "").trim().length, lb = (descB || "").trim().length;
  if (la !== lb) return la > lb;
  return ontologyIdOf(a) < ontologyIdOf(b);
}

/** Best pick across selected ontology prefixes */
async function bestPickAcrossOntologies(term, ontPrefixes, { size = 25, lang = "en", sleepMs = 50 } = {}) {
  let bestDoc = null;
  let bestDesc = "";

  for (const onto of ontPrefixes) {
    const data = await searchOLS4(term, { size, start: 0, ontology: onto, lang });
    const docs = (data.response && data.response.docs) || [];
    for (const d of docs) {
      const desc = await ensureDescription(d, { lang });
      if (better(d, bestDoc, term, desc, bestDesc)) {
        bestDoc = d; bestDesc = desc;
      }
    }
    if (sleepMs) await new Promise(r => setTimeout(r, sleepMs));
  }

  if (!bestDoc) return { ontology: "", ontology_id: "", label: "", description: "", iri: "", raw: null };
  return {
    ontology: ontologyPrefixOf(bestDoc),
    ontology_id: ontologyIdOf(bestDoc),
    label: bestDoc.label || "",
    description: (bestDesc || "").replace(/\s+/g, " ").trim(),
    iri: bestDoc.iri || "",
    raw: bestDoc
  };
}