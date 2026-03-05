const state = {
  headers: [],
  lines: [],
  vats: [],
  linesByInvoice: new Map(),
  vatByInvoice: new Map(),
  taxByInvoice: new Map(),
  filtered: [],
  selectedInvoice: null,
  stagedFiles: null,
};

const $ = (id) => document.getElementById(id);

const nodes = {
  datasetPath: $("datasetPath"),
  loadBtn: $("loadBtn"),
  dropZone: $("dropZone"),
  fileInput: $("fileInput"),
  preloadSummary: $("preloadSummary"),
  uploadState: $("uploadState"),
  statusText: $("statusText"),
  totalDocs: $("totalDocs"),
  invoice380: $("invoice380"),
  invoice381: $("invoice381"),
  invalidDocs: $("invalidDocs"),
  searchInvoice: $("searchInvoice"),
  statusFilter: $("statusFilter"),
  typeFilter: $("typeFilter"),
  countryFilter: $("countryFilter"),
  taxFilter: $("taxFilter"),
  scenarioFilter: $("scenarioFilter"),
  dateFrom: $("dateFrom"),
  dateTo: $("dateTo"),
  minAmount: $("minAmount"),
  maxAmount: $("maxAmount"),
  segmentFilter: $("segmentFilter"),
  invoiceTableBody: $("invoiceTableBody"),
  detailTitle: $("detailTitle"),
  headerDetail: $("headerDetail"),
  linesDetail: $("linesDetail"),
  vatDetail: $("vatDetail"),
  invoicePreview: $("invoicePreview"),
  pdfScope: $("pdfScope"),
  pdfMaxDocs: $("pdfMaxDocs"),
  previewPdfBtn: $("previewPdfBtn"),
  downloadPdfBtn: $("downloadPdfBtn"),
  pdfHint: $("pdfHint"),
  pdfPreviewFrame: $("pdfPreviewFrame"),
};

function parseCSV(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...data] = rows.filter((r) => r.length && r.some((v) => v !== ""));
  return data.map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";
    });
    return obj;
  });
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return parseCSV(await res.text());
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

function numberValue(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildIndexes() {
  state.linesByInvoice = new Map();
  state.vatByInvoice = new Map();
  state.taxByInvoice = new Map();

  state.lines.forEach((line) => {
    const inv = line.InvoiceID;
    if (!state.linesByInvoice.has(inv)) {
      state.linesByInvoice.set(inv, []);
      state.taxByInvoice.set(inv, new Set());
    }
    state.linesByInvoice.get(inv).push(line);
    state.taxByInvoice.get(inv).add(line.TaxCategory || "");
  });

  state.vats.forEach((row) => {
    const inv = row.InvoiceID;
    if (!state.vatByInvoice.has(inv)) {
      state.vatByInvoice.set(inv, []);
    }
    state.vatByInvoice.get(inv).push(row);
  });
}

function setStatus(text, isError = false) {
  nodes.statusText.textContent = text;
  nodes.statusText.style.color = isError ? "#b91c1c" : "";
}

function setUploadState(kind, text) {
  nodes.uploadState.className = `upload-state ${kind}`;
  nodes.uploadState.textContent = text;
}

function missingColumns(rows, requiredCols) {
  if (!rows || rows.length === 0) {
    return requiredCols.slice();
  }
  const present = new Set(Object.keys(rows[0]));
  return requiredCols.filter((col) => !present.has(col));
}

function populateSelectOptions() {
  const countries = [...new Set(state.headers.map((h) => h.BuyerCountry).filter(Boolean))].sort();
  const scenarios = [...new Set(state.headers.map((h) => h.ErrorScenarioCode).filter(Boolean))].sort();

  nodes.countryFilter.innerHTML = `<option value="all">All</option>${countries
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("")}`;
  nodes.scenarioFilter.innerHTML = `<option value="all">All</option>${scenarios
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("")}`;
}

function amountSegment(v) {
  const n = numberValue(v);
  if (n < 1000) return "small";
  if (n <= 10000) return "medium";
  return "large";
}

function applyFilters() {
  const query = nodes.searchInvoice.value.trim().toUpperCase();
  const status = nodes.statusFilter.value;
  const type = nodes.typeFilter.value;
  const country = nodes.countryFilter.value;
  const tax = nodes.taxFilter.value;
  const scenario = nodes.scenarioFilter.value;
  const dateFrom = nodes.dateFrom.value;
  const dateTo = nodes.dateTo.value;
  const minAmount = nodes.minAmount.value !== "" ? Number(nodes.minAmount.value) : null;
  const maxAmount = nodes.maxAmount.value !== "" ? Number(nodes.maxAmount.value) : null;
  const segment = nodes.segmentFilter.value;

  state.filtered = state.headers.filter((h) => {
    const invoiceId = (h.InvoiceID || "").toUpperCase();
    const hasError = Boolean(h.ErrorScenarioCode);
    const payable = numberValue(h.PayableAmount);
    const issueDate = h.IssueDate || "";

    if (query && !invoiceId.includes(query)) return false;
    if (status === "valid" && hasError) return false;
    if (status === "invalid" && !hasError) return false;
    if (type !== "all" && h.InvoiceTypeCode !== type) return false;
    if (country !== "all" && h.BuyerCountry !== country) return false;
    if (scenario !== "all" && h.ErrorScenarioCode !== scenario) return false;
    if (dateFrom && issueDate < dateFrom) return false;
    if (dateTo && issueDate > dateTo) return false;
    if (minAmount !== null && payable < minAmount) return false;
    if (maxAmount !== null && payable > maxAmount) return false;
    if (segment !== "all" && amountSegment(payable) !== segment) return false;
    if (tax !== "all") {
      const taxes = state.taxByInvoice.get(h.InvoiceID);
      if (!taxes || !taxes.has(tax)) return false;
    }
    return true;
  });

  renderSummary(state.filtered);
  renderTable();
}

function renderSummary(dataset) {
  const total = dataset.length;
  const inv380 = dataset.filter((d) => d.InvoiceTypeCode === "380").length;
  const inv381 = dataset.filter((d) => d.InvoiceTypeCode === "381").length;
  const invalid = dataset.filter((d) => d.ErrorScenarioCode).length;
  nodes.totalDocs.textContent = String(total);
  nodes.invoice380.textContent = String(inv380);
  nodes.invoice381.textContent = String(inv381);
  nodes.invalidDocs.textContent = String(invalid);
}

function rowStatusChip(header) {
  const cls = header.ErrorScenarioCode ? "invalid" : "valid";
  const text = header.ErrorScenarioCode ? "Invalid" : "Valid";
  return `<span class="chip ${cls}">${text}</span>`;
}

function renderTable() {
  nodes.invoiceTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((h) => {
    const tr = document.createElement("tr");
    if (state.selectedInvoice === h.InvoiceID) tr.classList.add("selected");
    tr.innerHTML = `
      <td>${h.InvoiceID}</td>
      <td>${h.InvoiceTypeCode}</td>
      <td>${h.IssueDate}</td>
      <td>${h.BuyerID}</td>
      <td>${h.BuyerCountry}</td>
      <td>${[...(state.taxByInvoice.get(h.InvoiceID) || [])].join(", ")}</td>
      <td>${h.PayableAmount}</td>
      <td>${rowStatusChip(h)}</td>
      <td>${h.ErrorScenarioCode || "-"}</td>
    `;
    tr.addEventListener("click", () => selectInvoice(h.InvoiceID));
    fragment.appendChild(tr);
  });
  nodes.invoiceTableBody.appendChild(fragment);
}

function selectInvoice(invoiceId) {
  state.selectedInvoice = invoiceId;
  const header = state.headers.find((h) => h.InvoiceID === invoiceId);
  const lines = state.linesByInvoice.get(invoiceId) || [];
  const vat = state.vatByInvoice.get(invoiceId) || [];

  nodes.detailTitle.textContent = `Invoice Details: ${invoiceId}`;
  nodes.headerDetail.textContent = JSON.stringify(header, null, 2);
  nodes.linesDetail.textContent = JSON.stringify(lines, null, 2);
  nodes.vatDetail.textContent = JSON.stringify(vat, null, 2);
  renderInvoicePreview(header, lines, vat);
  renderTable();
}

function renderInvoicePreview(header, lines, vatRows) {
  if (!header) {
    nodes.invoicePreview.innerHTML = "";
    return;
  }
  const lineRows = lines
    .map(
      (ln) => `<tr>
        <td>${ln.LineNumber}</td>
        <td>${ln.ItemDescription}</td>
        <td>${ln.Quantity}</td>
        <td>${ln.UnitPrice}</td>
        <td>${ln.TaxCategory}</td>
        <td>${ln.LineExtensionAmount}</td>
      </tr>`,
    )
    .join("");
  const vatRowsHtml = vatRows
    .map(
      (v) => `<tr>
        <td>${v.TaxCategory}</td>
        <td>${v.TaxRate}</td>
        <td>${v.TaxableAmount}</td>
        <td>${v.TaxAmount}</td>
      </tr>`,
    )
    .join("");

  nodes.invoicePreview.innerHTML = `
    <div class="preview-header">
      <div>
        <h4 style="margin:0;">Tax Invoice</h4>
        <div style="font-size:0.83rem;color:#456356;">${header.InvoiceID}</div>
      </div>
      <img class="preview-logo" src="./assets/dariba-tech-logo.png" alt="Dariba Tech" />
    </div>
    <div class="preview-grid">
      <div><strong>Issue Date:</strong> ${header.IssueDate}</div>
      <div><strong>Due Date:</strong> ${header.DueDate}</div>
      <div><strong>Buyer ID:</strong> ${header.BuyerID}</div>
      <div><strong>Country:</strong> ${header.BuyerCountry}</div>
      <div><strong>Type:</strong> ${header.InvoiceTypeCode}</div>
      <div><strong>Status:</strong> ${header.InvoiceStatus}</div>
    </div>
    <table class="preview-table">
      <thead>
        <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Line Amount</th></tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
    <div style="height:0.65rem;"></div>
    <table class="preview-table">
      <thead>
        <tr><th>Tax Cat</th><th>Rate</th><th>Taxable</th><th>Tax</th></tr>
      </thead>
      <tbody>${vatRowsHtml}</tbody>
    </table>
    <div style="height:0.65rem;"></div>
    <div class="preview-grid">
      <div><strong>Tax Exclusive:</strong> ${header.TaxExclusiveAmount}</div>
      <div><strong>Tax Amount:</strong> ${header.TaxAmount}</div>
      <div><strong>Tax Inclusive:</strong> ${header.TaxInclusiveAmount}</div>
      <div><strong>Payable:</strong> ${header.PayableAmount}</div>
    </div>
  `;
}

function downloadSelectedInvoicePdf() {
  const selection = resolvePdfSelection();
  if (!selection.ok) {
    setStatus(selection.message, true);
    return;
  }
  const doc = buildPdf(selection.headers);
  if (!doc) return;
  const suffix = selection.headers.length > 1 ? "_batch" : `_${selection.headers[0].InvoiceID}`;
  doc.save(`dariba_synthetic_invoice${suffix}.pdf`);
  setStatus(`Downloaded PDF for ${selection.headers.length} document(s).`);
}

function resolvePdfSelection() {
  const scope = nodes.pdfScope.value;
  const maxDocs = Math.max(1, Math.min(50, Number(nodes.pdfMaxDocs.value) || 1));
  nodes.pdfMaxDocs.value = String(maxDocs);

  if (scope === "selected") {
    const header = state.headers.find((h) => h.InvoiceID === state.selectedInvoice);
    if (!header) {
      return { ok: false, message: "Select an invoice first for PDF actions." };
    }
    nodes.pdfHint.textContent = "PDF scope: selected invoice.";
    return { ok: true, headers: [header], maxDocs };
  }

  if (state.filtered.length === 0) {
    return { ok: false, message: "No filtered invoices available for PDF generation." };
  }
  const picked = state.filtered.slice(0, maxDocs);
  nodes.pdfHint.textContent = `PDF scope: filtered invoices. Using ${picked.length} of ${state.filtered.length} (max ${maxDocs}).`;
  return { ok: true, headers: picked, maxDocs };
}

function buildPdf(headers) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    setStatus("PDF library not loaded.", true);
    return null;
  }
  const doc = new jsPDF();
  headers.forEach((header, idx) => {
    if (idx > 0) doc.addPage();
    const lines = state.linesByInvoice.get(header.InvoiceID) || [];
    const vats = state.vatByInvoice.get(header.InvoiceID) || [];
    let y = 14;
    doc.setFontSize(16);
    doc.text("Dariba Tech - Synthetic Tax Invoice", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Invoice ID: ${header.InvoiceID}`, 14, y);
    doc.text(`Type: ${header.InvoiceTypeCode}`, 130, y);
    y += 6;
    doc.text(`Issue Date: ${header.IssueDate}`, 14, y);
    doc.text(`Due Date: ${header.DueDate}`, 130, y);
    y += 6;
    doc.text(`Buyer: ${header.BuyerID} (${header.BuyerCountry})`, 14, y);
    y += 8;
    doc.text("Lines:", 14, y);
    y += 6;
    lines.forEach((ln) => {
      doc.text(
        `${ln.LineNumber}. ${ln.ItemDescription} | Qty ${ln.Quantity} | Tax ${ln.TaxCategory} | AED ${ln.LineExtensionAmount}`,
        14,
        y,
      );
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 14;
      }
    });
    y += 3;
    doc.text("VAT Breakdown:", 14, y);
    y += 6;
    vats.forEach((v) => {
      doc.text(`Category ${v.TaxCategory} @ ${v.TaxRate}% | Taxable ${v.TaxableAmount} | Tax ${v.TaxAmount}`, 14, y);
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 14;
      }
    });
    y += 4;
    doc.text(`Tax Exclusive: ${header.TaxExclusiveAmount}`, 14, y);
    y += 5;
    doc.text(`Tax Amount: ${header.TaxAmount}`, 14, y);
    y += 5;
    doc.text(`Tax Inclusive: ${header.TaxInclusiveAmount}`, 14, y);
    y += 5;
    doc.text(`Payable: ${header.PayableAmount}`, 14, y);
  });
  return doc;
}

function previewPdf() {
  const selection = resolvePdfSelection();
  if (!selection.ok) {
    setStatus(selection.message, true);
    return;
  }
  const doc = buildPdf(selection.headers);
  if (!doc) return;
  const blobUrl = doc.output("bloburl");
  nodes.pdfPreviewFrame.src = blobUrl;
  setStatus(`Preview generated for ${selection.headers.length} document(s).`);
}

async function loadDataset() {
  const base = nodes.datasetPath.value.trim().replace(/\/$/, "");
  if (!base) {
    setStatus("Provide a dataset path.", true);
    return;
  }

  setStatus("Loading dataset...");
  try {
    const [headers, lines, vats] = await Promise.all([
      loadCSV(`${base}/invoice_headers.csv`),
      loadCSV(`${base}/invoice_lines.csv`),
      loadCSV(`${base}/invoice_vat_breakdown.csv`),
    ]);
    state.headers = headers;
    state.lines = lines;
    state.vats = vats;
    buildIndexes();
    populateSelectOptions();
    state.selectedInvoice = null;
    applyFilters();
    if (state.filtered.length > 0) {
      selectInvoice(state.filtered[0].InvoiceID);
    } else {
      nodes.headerDetail.textContent = "";
      nodes.linesDetail.textContent = "";
      nodes.vatDetail.textContent = "";
      nodes.detailTitle.textContent = "Invoice Details";
    }
    setUploadState("loaded", "Loaded from folder path");
    setStatus(`Loaded ${state.headers.length} headers, ${state.lines.length} lines.`);
  } catch (err) {
    setUploadState("error", "Load failed");
    setStatus(`Load failed: ${err.message}. Run via local server (not file://).`, true);
  }
}

async function stageFromFiles(fileList) {
  const files = Array.from(fileList || []);
  const needed = ["invoice_headers.csv", "invoice_lines.csv", "invoice_vat_breakdown.csv"];
  const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
  const missing = needed.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    nodes.preloadSummary.textContent = `Missing required file(s): ${missing.join(", ")}`;
    setUploadState("error", "Missing required files");
    return;
  }
  try {
    const [hText, lText, vText] = await Promise.all([
      readFileAsText(byName.get("invoice_headers.csv")),
      readFileAsText(byName.get("invoice_lines.csv")),
      readFileAsText(byName.get("invoice_vat_breakdown.csv")),
    ]);
    const headers = parseCSV(hText);
    const lines = parseCSV(lText);
    const vats = parseCSV(vText);
    const reqHeaders = ["InvoiceID", "InvoiceTypeCode", "IssueDate", "BuyerCountry", "PayableAmount"];
    const reqLines = ["InvoiceID", "LineNumber", "ItemDescription", "Quantity", "TaxCategory", "LineExtensionAmount"];
    const reqVat = ["InvoiceID", "TaxCategory", "TaxRate", "TaxableAmount", "TaxAmount"];
    const missingHeaderCols = missingColumns(headers, reqHeaders);
    const missingLineCols = missingColumns(lines, reqLines);
    const missingVatCols = missingColumns(vats, reqVat);
    if (missingHeaderCols.length || missingLineCols.length || missingVatCols.length) {
      const parts = [];
      if (missingHeaderCols.length) parts.push(`headers missing: ${missingHeaderCols.join(", ")}`);
      if (missingLineCols.length) parts.push(`lines missing: ${missingLineCols.join(", ")}`);
      if (missingVatCols.length) parts.push(`vat missing: ${missingVatCols.join(", ")}`);
      nodes.preloadSummary.textContent = `Schema check failed: ${parts.join(" | ")}`;
      setUploadState("error", "Staged files failed validation");
      return;
    }
    const invoiceCount = new Set(headers.map((h) => h.InvoiceID)).size;
    state.stagedFiles = { headers, lines, vats };
    nodes.preloadSummary.textContent =
      `Verified files: headers=${headers.length} rows, lines=${lines.length} rows, vat=${vats.length} rows, distinct invoices=${invoiceCount}. Click "Run Dataset" to apply.`;
    setUploadState("staged", "Uploaded and verified");
    setStatus("Files uploaded and verified. Ready to run.");
  } catch (err) {
    setUploadState("error", "File parsing failed");
    setStatus(`File parsing failed: ${err.message}`, true);
  }
}

function loadStagedDataset() {
  if (!state.stagedFiles) return false;
  state.headers = state.stagedFiles.headers;
  state.lines = state.stagedFiles.lines;
  state.vats = state.stagedFiles.vats;
  buildIndexes();
  populateSelectOptions();
  state.selectedInvoice = null;
  applyFilters();
  if (state.filtered.length > 0) selectInvoice(state.filtered[0].InvoiceID);
  setUploadState("loaded", "Staged files loaded");
  setStatus(`Loaded staged dataset: ${state.headers.length} headers, ${state.lines.length} lines.`);
  return true;
}

function wireEvents() {
  nodes.loadBtn.addEventListener("click", async () => {
    if (!loadStagedDataset()) {
      await loadDataset();
    }
  });
  nodes.previewPdfBtn.addEventListener("click", previewPdf);
  nodes.downloadPdfBtn.addEventListener("click", downloadSelectedInvoicePdf);
  [
    nodes.searchInvoice,
    nodes.statusFilter,
    nodes.typeFilter,
    nodes.countryFilter,
    nodes.taxFilter,
    nodes.scenarioFilter,
    nodes.dateFrom,
    nodes.dateTo,
    nodes.minAmount,
    nodes.maxAmount,
    nodes.segmentFilter,
  ].forEach((el) => el.addEventListener("input", applyFilters));
  nodes.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    nodes.dropZone.classList.add("dragover");
  });
  nodes.dropZone.addEventListener("dragleave", () => nodes.dropZone.classList.remove("dragover"));
  nodes.dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    nodes.dropZone.classList.remove("dragover");
    await stageFromFiles(e.dataTransfer.files);
  });
  nodes.fileInput.addEventListener("change", async (e) => {
    await stageFromFiles(e.target.files);
  });
  nodes.pdfScope.addEventListener("change", () => {
    const selectedOnly = nodes.pdfScope.value === "selected";
    nodes.pdfMaxDocs.disabled = selectedOnly;
    nodes.pdfHint.textContent = selectedOnly
      ? "PDF scope: selected invoice only."
      : "PDF scope: filtered invoices. Max docs applies.";
  });
}

wireEvents();
setUploadState("idle", "No files staged");
nodes.pdfMaxDocs.disabled = true;
