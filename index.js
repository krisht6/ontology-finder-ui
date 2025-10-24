// index.js

// Shared ontology selection
const ontoChecks = [...document.querySelectorAll(".onto")];
const customOntos = document.getElementById("customOntos");
function getOntPrefixes() {
  const selected = ontoChecks.filter(c => c.checked).map(c => c.value.toLowerCase());
  const custom = (customOntos.value || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set([...selected, ...custom]));
}

/* ---------- Tabs ---------- */
const tabBtns = [...document.querySelectorAll(".tab-btn")];
const tabs = [...document.querySelectorAll(".tab")];
tabBtns.forEach(btn => btn.addEventListener("click", () => {
  tabBtns.forEach(b => b.classList.remove("active"));
  tabs.forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
}));

/* ---------- SINGLE SEARCH ---------- */
const form = document.getElementById("search-form");
const statusEl = document.getElementById("status");
const resultsBody = document.getElementById("resultsBody");
const rawJson = document.getElementById("raw-json");
const summary = document.getElementById("summary");
const copyBtn = document.getElementById("copyJsonBtn");
const lookupBySel = document.getElementById("lookupBy");
const queryValue = document.getElementById("queryValue");
const onlyCL = document.getElementById("onlyCL");
const dedupeChk = document.getElementById("dedupe");

lookupBySel.addEventListener("change", () => {
  const mode = lookupBySel.value;
  queryValue.placeholder =
    mode === "short_form" ? "CL_0000084" :
    mode === "obo_id"     ? "CL:0000084" :
    mode === "iri"        ? "http://purl.obolibrary.org/obo/CL_0000084" :
                            "T cell";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Loading…";
  resultsBody.innerHTML = "";
  rawJson.textContent = "";
  summary.innerHTML = "";

  const lookupBy = lookupBySel.value;
  const value     = queryValue.value.trim();
  const lang      = (document.getElementById("lang").value || "en").trim();
  const sizeVal   = document.getElementById("size").value;
  const pageVal   = document.getElementById("page").value;
  const size      = sizeVal ? Number(sizeVal) : undefined;
  const page      = pageVal ? Number(pageVal) : undefined;

  if (!value) {
    statusEl.textContent = "Please enter a value to search.";
    return;
  }

  try {
    // LABEL path -> across chosen ontologies (or only CL if toggle set)
    if (lookupBy === "label") {
      const ontPrefixes = onlyCL.checked ? ["cl"] : getOntPrefixes();
      const result = await bestPickAcrossOntologies(value, ontPrefixes, { size: size ?? 25, lang, sleepMs: 30 });
      rawJson.textContent = JSON.stringify(result.raw || {}, null, 2);

      const items = [];
      if (result.ontology_id) {
        items.push({
          label: result.label,
          ontology: result.ontology,
          ontology_id: result.ontology_id,
          iri: result.iri,
          synonyms: (result.raw?.synonym || []),
        });
      }

      // Deduping is trivial here (we kept the single best); still honoring UI intent
      const docs = dedupeChk.checked ? items : items;

      summary.innerHTML = `
        <div><strong>Matches:</strong> ${docs.length}</div>
        ${onlyCL.checked ? `<div><strong>Ontology filter:</strong> CL</div>` : `<div><strong>Ontologies:</strong> ${getOntPrefixes().join(", ") || "—"}</div>`}
      `;

      resultsBody.innerHTML = docs.map(doc => {
        const syns = (doc.synonyms || []).slice(0,8).join(", ");
        const badge = badgeClass(doc.ontology);
        return `
          <tr>
            <td>${escapeHtml(doc.label || "")}</td>
            <td><span class="badge ${badge}">${escapeHtml(doc.ontology || "—")}</span></td>
            <td>${doc.ontology_id ? `<a class="idlink" href="${iriFromId(doc.ontology_id)}" target="_blank" rel="noopener">${escapeHtml(doc.ontology_id)}</a>` : "—"}</td>
            <td>${doc.iri ? `<a class="idlink" href="${escapeAttr(doc.iri)}" target="_blank" rel="noopener">link</a>` : "—"}</td>
            <td>${escapeHtml(syns)}</td>
          </tr>
        `;
      }).join("");

      statusEl.textContent = "Done (label search).";
      return;
    }

    // IDENTIFIER path -> /api/individuals
    const params = { lang };
    if (size !== undefined) params.size = size;
    if (page !== undefined) params.page = page;
    if (lookupBy === "iri")        params.iri = value;
    if (lookupBy === "short_form") params.short_form = value;
    if (lookupBy === "obo_id")     params.obo_id = value;

    const data = await getIndividuals(params);
    rawJson.textContent = JSON.stringify(data, null, 2);

    const pageInfo = data.page || {};
    const items = (data._embedded && data._embedded.individuals) ? data._embedded.individuals : [];

    summary.innerHTML = `
      <div><strong>Matches:</strong> ${items.length}</div>
      <div><strong>Page:</strong> ${pageInfo.number ?? 0} / ${pageInfo.totalPages ?? 0} (size ${pageInfo.size ?? "?"})</div>
      <div><strong>Total Elements:</strong> ${pageInfo.totalElements ?? "?"}</div>
    `;

    resultsBody.innerHTML = items.map(ind => {
      const synonyms = (ind.synonyms || []).slice(0, 8).join(", ");
      const label = ind.label || "(no label)";
      const iri = ind.iri || "";
      const obo = ind.obo_id || "";
      const sf  = ind.short_form || "";
      const onto = (ind.ontology_prefix || ind.ontology_name || "").toUpperCase();
      const ontoId = obo || sf || (iri ? iri.split("/").pop() : "");
      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td><span class="badge ${badgeClass(onto)}">${escapeHtml(onto || "—")}</span></td>
          <td>${ontoId ? `<a class="idlink" href="${iriFromId(ontoId)}" target="_blank" rel="noopener">${escapeHtml(ontoId)}</a>` : "—"}</td>
          <td><a class="idlink" href="${escapeAttr(iri)}" target="_blank" rel="noopener">${iri ? "link" : "—"}</a></td>
          <td>${escapeHtml(synonyms)}</td>
        </tr>
      `;
    }).join("");

    statusEl.textContent = "Done.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = String(err.message || err);
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(rawJson.textContent || "");
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy JSON"), 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => (copyBtn.textContent = "Copy JSON"), 1200);
  }
});

/* ---------- BATCH LOOKUP ---------- */
const txtTerms = document.getElementById("termsText");
const fileTerms = document.getElementById("termsFile");
const runBatch = document.getElementById("runBatch");
const batchBody = document.getElementById("batchBody");
const batchRaw = document.getElementById("batch-raw-json");
const copyBatchJsonBtn = document.getElementById("copyBatchJsonBtn");
const dlBtn = document.getElementById("downloadCsv");
const progressWrap = document.getElementById("progressWrap");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const batchStatus = document.getElementById("batchStatus");
const batchSizeInput = document.getElementById("batchSize");
const sleepInput = document.getElementById("sleep");

fileTerms.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const existing = txtTerms.value.trim();
  txtTerms.value = existing ? (existing + "\n" + lines.join("\n")) : lines.join("\n");
});

runBatch.addEventListener("click", async () => {
  const terms = txtTerms.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!terms.length) { batchStatus.textContent = "Add terms (textarea or file)."; return; }

  const ontPrefixes = getOntPrefixes();
  if (!ontPrefixes.length) { batchStatus.textContent = "Select or add at least one ontology prefix."; return; }

  const size = Math.max(1, parseInt(batchSizeInput.value || "25", 10));
  const sleepMs = Math.max(0, parseInt(sleepInput.value || "50", 10));

  batchBody.innerHTML = "";
  batchRaw.textContent = "";
  batchStatus.textContent = "";
  progressWrap.hidden = false;
  progressText.textContent = "Starting…";
  progressFill.style.width = "0%";

  const rows = [];
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    progressText.textContent = `[${i+1}/${terms.length}] ${t}`;
    progressFill.style.width = `${Math.round(((i)/terms.length)*100)}%`;
    try {
      const result = await bestPickAcrossOntologies(t, ontPrefixes, { size, lang: "en", sleepMs });
      batchRaw.textContent = JSON.stringify(result.raw || {}, null, 2);
      const row = {
        index: i+1,
        term: t,
        ontology: result.ontology || "",
        ontology_id: result.ontology_id || "",
        label: result.label || "",
        description: result.description || "",
        iri: result.iri || ""
      };
      rows.push(row);
      appendBatchRow(row);
    } catch {
      const row = { index: i+1, term: t, ontology: "", ontology_id: "", label: "", description: "", iri: "" };
      rows.push(row);
      appendBatchRow(row);
    }
  }
  progressFill.style.width = "100%";
  progressText.textContent = "Done.";
  batchStatus.textContent = `Completed ${terms.length} terms.`;

  dlBtn.onclick = () => downloadCsv(rows);
});

copyBatchJsonBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(batchRaw.textContent || "");
    copyBatchJsonBtn.textContent = "Copied!";
    setTimeout(() => (copyBatchJsonBtn.textContent = "Copy JSON"), 1200);
  } catch {
    copyBatchJsonBtn.textContent = "Copy failed";
    setTimeout(() => (copyBatchJsonBtn.textContent = "Copy JSON"), 1200);
  }
});

function appendBatchRow(r) {
  const badgeCls = badgeClass(r.ontology);
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${r.index}</td>
    <td>${escapeHtml(r.term)}</td>
    <td><span class="badge ${badgeCls}">${escapeHtml(r.ontology || "—")}</span></td>
    <td>${r.ontology_id ? `<a class="idlink" href="${iriFromId(r.ontology_id)}" target="_blank" rel="noopener">${escapeHtml(r.ontology_id)}</a>` : "—"}</td>
    <td>${escapeHtml(r.label || "—")}</td>
    <td>${escapeHtml(r.description || "")}</td>
    <td>${r.iri ? `<a class="idlink" href="${escapeAttr(r.iri)}" target="_blank" rel="noopener">link</a>` : "—"}</td>
  `;
  batchBody.appendChild(tr);
}

/* ---------- Utils ---------- */
function badgeClass(onto) {
  if (onto === "CL") return "CL";
  if (onto === "GO") return "GO";
  if (onto === "NCIT") return "NCIT";
  return "OTHER";
}
function iriFromId(oid) {
  // Try to form PURL for OBO style IDs CL:0000084 -> http://purl.obolibrary.org/obo/CL_0000084
  if (/^[A-Za-z]+:\d+/.test(oid)) {
    const [p, n] = oid.split(":");
    return `http://purl.obolibrary.org/obo/${p}_${n}`;
  }
  return "#";
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCsv(rows) {
  const header = ["term","ontology","ontology_id","label","description","iri"];
  const csv = [header.join(",")].concat(rows.map(r => header.map(h => csvEscape(r[h] ?? "")).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "ontology_results.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}