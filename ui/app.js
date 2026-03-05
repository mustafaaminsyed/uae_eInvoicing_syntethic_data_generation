const state = {
  headers: [],
  lines: [],
  vats: [],
  linesByInvoice: new Map(),
  vatByInvoice: new Map(),
  taxByInvoice: new Map(),
  filtered: [],
  selectedInvoice: null,
};

const $ = (id) => document.getElementById(id);

const nodes = {
  datasetPath: $("datasetPath"),
  loadBtn: $("loadBtn"),
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
  renderTable();
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
    setStatus(`Loaded ${state.headers.length} headers, ${state.lines.length} lines.`);
  } catch (err) {
    setStatus(`Load failed: ${err.message}. Run via local server (not file://).`, true);
  }
}

function wireEvents() {
  nodes.loadBtn.addEventListener("click", loadDataset);
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
}

wireEvents();
