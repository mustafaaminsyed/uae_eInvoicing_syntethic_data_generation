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
  sourceSchema: "unknown",
  mofRowsByInvoice: new Map(),
  coverageStats: new Map(),
  coverageInvoiceIds: [],
  tableSort: "issue_desc",
  pageSize: 25,
  pageIndex: 0,
  visibleColumns: new Set(["invoiceId", "type", "issueDate", "buyer", "country", "tax", "payable", "status", "scenario"]),
  savedViews: [],
};

const $ = (id) => document.getElementById(id);

const nodes = {
  datasetPath: $("datasetPath"),
  loadBtn: $("loadBtn"),
  dropZone: $("dropZone"),
  fileInput: $("fileInput"),
  preloadSummary: $("preloadSummary"),
  uploadState: $("uploadState"),
  chkHeaders: $("chkHeaders"),
  chkLines: $("chkLines"),
  chkVat: $("chkVat"),
  chkMof: $("chkMof"),
  schemaDetected: $("schemaDetected"),
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
  resetFiltersBtn: $("resetFiltersBtn"),
  invoiceTableBody: $("invoiceTableBody"),
  tableSort: $("tableSort"),
  pageSize: $("pageSize"),
  prevPageBtn: $("prevPageBtn"),
  nextPageBtn: $("nextPageBtn"),
  pageMeta: $("pageMeta"),
  columnToggles: $("columnToggles"),
  saveViewBtn: $("saveViewBtn"),
  loadViewBtn: $("loadViewBtn"),
  deleteViewBtn: $("deleteViewBtn"),
  savedViewSelect: $("savedViewSelect"),
  exportFilteredBtn: $("exportFilteredBtn"),
  qualityMetrics: $("qualityMetrics"),
  detailTitle: $("detailTitle"),
  headerDetail: $("headerDetail"),
  linesDetail: $("linesDetail"),
  vatDetail: $("vatDetail"),
  invoicePreview: $("invoicePreview"),
  mandatoryMatrix: $("mandatoryMatrix"),
  invoiceMode: $("invoiceMode"),
  coverageInvoiceSelect: $("coverageInvoiceSelect"),
  coverageStatusFilter: $("coverageStatusFilter"),
  coverageSort: $("coverageSort"),
  coveragePrevBtn: $("coveragePrevBtn"),
  coverageNextBtn: $("coverageNextBtn"),
  coverageHint: $("coverageHint"),
  pdfScope: $("pdfScope"),
  pdfMaxDocs: $("pdfMaxDocs"),
  previewPdfBtn: $("previewPdfBtn"),
  downloadPdfBtn: $("downloadPdfBtn"),
  pdfHint: $("pdfHint"),
  pdfPreviewFrame: $("pdfPreviewFrame"),
};

const SAVED_VIEWS_KEY = "uae_einvoice_saved_views_v1";
const TABLE_COLUMNS = [
  { key: "invoiceId", label: "Invoice ID" },
  { key: "type", label: "Type" },
  { key: "issueDate", label: "Issue Date" },
  { key: "buyer", label: "Buyer" },
  { key: "country", label: "Country" },
  { key: "tax", label: "Tax" },
  { key: "payable", label: "Payable (AED)" },
  { key: "status", label: "Status" },
  { key: "scenario", label: "Scenario" },
];

const TAXABLE_FIELDS = [
  ["1", "Invoice number", "invoice_number"],
  ["2", "Invoice date", "invoice_date"],
  ["3", "Invoice type code", "invoice_type_code"],
  ["4", "Invoice currency code", "invoice_currency_code"],
  ["5", "Invoice transaction type code", "invoice_transaction_type_code"],
  ["6", "Payment due date", "payment_due_date"],
  ["7", "Business process type", "business_process_type"],
  ["8", "Specification identifier", "specification_identifier"],
  ["9", "Payment means type code", "payment_means_type_code"],
  ["10", "Seller name", "seller_name"],
  ["11", "Seller electronic address", "seller_electronic_address"],
  ["12", "Seller electronic identifier", "seller_electronic_identifier"],
  ["13", "Seller legal registration identifier", "seller_legal_registration_identifier"],
  ["14", "Seller legal registration identifier type", "seller_legal_registration_identifier_type"],
  ["15", "Seller tax registration identifier", "seller_tax_registration_identifier"],
  ["16", "Seller tax scheme code", "seller_tax_scheme_code"],
  ["17", "Seller address line 1", "seller_address_line_1"],
  ["18", "Seller city", "seller_city"],
  ["19", "Seller country subdivision", "seller_country_subdivision"],
  ["20", "Seller country code", "seller_country_code"],
  ["21", "Buyer name", "buyer_name"],
  ["22", "Buyer electronic address", "buyer_electronic_address"],
  ["23", "Buyer electronic identifier", "buyer_electronic_identifier"],
  ["24", "Buyer legal registration identifier", "buyer_legal_registration_identifier"],
  ["25", "Buyer legal registration identifier type", "buyer_legal_registration_identifier_type"],
  ["26", "Buyer address line 1", "buyer_address_line_1"],
  ["27", "Buyer city", "buyer_city"],
  ["28", "Buyer country subdivision", "buyer_country_subdivision"],
  ["29", "Buyer country code", "buyer_country_code"],
  ["30", "Sum of invoice line net amount", "sum_of_invoice_line_net_amount"],
  ["31", "Invoice total amount without tax", "invoice_total_amount_without_tax"],
  ["32", "Invoice total tax amount", "invoice_total_tax_amount"],
  ["33", "Invoice total amount with tax", "invoice_total_amount_with_tax"],
  ["34", "Amount due for payment", "amount_due_for_payment"],
  ["35", "Tax category taxable amount", "tax_category_taxable_amount"],
  ["36", "Tax category tax amount", "tax_category_tax_amount"],
  ["37", "Tax category code", "tax_category_code"],
  ["38", "Tax category rate", "tax_category_rate"],
  ["39", "Invoice line identifier", "invoice_line_identifier"],
  ["40", "Invoiced quantity", "invoiced_quantity"],
  ["41", "Unit of measure code", "unit_of_measure_code"],
];

const COMMERCIAL_EXTRA_FIELDS = [
  ["42", "Invoice line net amount", "invoice_line_net_amount"],
  ["43", "Item net price", "item_net_price"],
  ["44", "Item gross price", "item_gross_price"],
  ["45", "Item price base quantity", "item_price_base_quantity"],
  ["46", "Invoiced item tax category code", "invoiced_item_tax_category_code"],
  ["47", "Invoiced item tax rate", "invoiced_item_tax_rate"],
  ["48", "VAT line amount in AED", "vat_line_amount_in_aed"],
  ["49", "Invoice line amount in AED", "invoice_line_amount_in_aed"],
  ["50", "Item name", "item_name"],
  ["51", "Item description", "item_description"],
];

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

function setChecklist(byName = new Map()) {
  const checks = [
    [nodes.chkHeaders, "invoice_headers.csv"],
    [nodes.chkLines, "invoice_lines.csv"],
    [nodes.chkVat, "invoice_vat_breakdown.csv"],
    [nodes.chkMof, "mof_schema_dataset.csv"],
  ];
  checks.forEach(([node, file]) => {
    node.classList.toggle("ok", byName.has(file));
  });
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

function resetFilters() {
  nodes.searchInvoice.value = "";
  nodes.statusFilter.value = "all";
  nodes.typeFilter.value = "all";
  nodes.countryFilter.value = "all";
  nodes.taxFilter.value = "all";
  nodes.scenarioFilter.value = "all";
  nodes.dateFrom.value = "";
  nodes.dateTo.value = "";
  nodes.minAmount.value = "";
  nodes.maxAmount.value = "";
  nodes.segmentFilter.value = "all";
  applyFilters();
}

function applyPreset(preset) {
  resetFilters();
  if (preset === "valid") {
    nodes.statusFilter.value = "valid";
  } else if (preset === "invalid") {
    nodes.statusFilter.value = "invalid";
  } else if (preset === "invoice") {
    nodes.typeFilter.value = "380";
  } else if (preset === "credit") {
    nodes.typeFilter.value = "381";
  } else if (preset === "high_value") {
    nodes.minAmount.value = "10000";
  }
  applyFilters();
}

function getFilterSnapshot() {
  return {
    searchInvoice: nodes.searchInvoice.value,
    statusFilter: nodes.statusFilter.value,
    typeFilter: nodes.typeFilter.value,
    countryFilter: nodes.countryFilter.value,
    taxFilter: nodes.taxFilter.value,
    scenarioFilter: nodes.scenarioFilter.value,
    dateFrom: nodes.dateFrom.value,
    dateTo: nodes.dateTo.value,
    minAmount: nodes.minAmount.value,
    maxAmount: nodes.maxAmount.value,
    segmentFilter: nodes.segmentFilter.value,
    tableSort: nodes.tableSort.value,
    pageSize: nodes.pageSize.value,
    visibleColumns: [...state.visibleColumns],
  };
}

function applyFilterSnapshot(snapshot) {
  if (!snapshot) return;
  nodes.searchInvoice.value = snapshot.searchInvoice ?? "";
  nodes.statusFilter.value = snapshot.statusFilter ?? "all";
  nodes.typeFilter.value = snapshot.typeFilter ?? "all";
  nodes.countryFilter.value = snapshot.countryFilter ?? "all";
  nodes.taxFilter.value = snapshot.taxFilter ?? "all";
  nodes.scenarioFilter.value = snapshot.scenarioFilter ?? "all";
  nodes.dateFrom.value = snapshot.dateFrom ?? "";
  nodes.dateTo.value = snapshot.dateTo ?? "";
  nodes.minAmount.value = snapshot.minAmount ?? "";
  nodes.maxAmount.value = snapshot.maxAmount ?? "";
  nodes.segmentFilter.value = snapshot.segmentFilter ?? "all";
  nodes.tableSort.value = snapshot.tableSort ?? "issue_desc";
  nodes.pageSize.value = snapshot.pageSize ?? "25";
  state.tableSort = nodes.tableSort.value;
  state.pageSize = Number(nodes.pageSize.value) || 25;
  if (Array.isArray(snapshot.visibleColumns) && snapshot.visibleColumns.length > 0) {
    state.visibleColumns = new Set(snapshot.visibleColumns);
  }
  renderColumnToggles();
  applyColumnVisibility();
  applyFilters();
}

function renderSavedViews() {
  const options = state.savedViews
    .map((v) => `<option value="${v.name}">${v.name}</option>`)
    .join("");
  nodes.savedViewSelect.innerHTML = `<option value="">Select saved view</option>${options}`;
}

function loadSavedViews() {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    state.savedViews = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.savedViews)) state.savedViews = [];
  } catch {
    state.savedViews = [];
  }
  renderSavedViews();
}

function persistSavedViews() {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(state.savedViews));
  renderSavedViews();
}

function saveCurrentView() {
  const name = window.prompt("Enter a name for this view:");
  if (!name) return;
  const cleanName = name.trim();
  if (!cleanName) return;
  const snapshot = getFilterSnapshot();
  const existingIdx = state.savedViews.findIndex((v) => v.name === cleanName);
  if (existingIdx >= 0) {
    state.savedViews[existingIdx] = { name: cleanName, snapshot };
  } else {
    state.savedViews.push({ name: cleanName, snapshot });
  }
  persistSavedViews();
  nodes.savedViewSelect.value = cleanName;
  setStatus(`Saved view: ${cleanName}`);
}

function loadSelectedView() {
  const name = nodes.savedViewSelect.value;
  if (!name) {
    setStatus("Select a saved view to load.", true);
    return;
  }
  const picked = state.savedViews.find((v) => v.name === name);
  if (!picked) {
    setStatus("Saved view not found.", true);
    return;
  }
  applyFilterSnapshot(picked.snapshot);
  setStatus(`Loaded view: ${name}`);
}

function deleteSelectedView() {
  const name = nodes.savedViewSelect.value;
  if (!name) {
    setStatus("Select a saved view to delete.", true);
    return;
  }
  state.savedViews = state.savedViews.filter((v) => v.name !== name);
  persistSavedViews();
  setStatus(`Deleted view: ${name}`);
}

function renderColumnToggles() {
  nodes.columnToggles.innerHTML = TABLE_COLUMNS.map((col) => {
    const checked = state.visibleColumns.has(col.key) ? "checked" : "";
    return `
      <label class="column-option">
        <input type="checkbox" data-col-toggle="${col.key}" ${checked} />
        <span>${col.label}</span>
      </label>
    `;
  }).join("");
}

function applyColumnVisibility() {
  const allCols = document.querySelectorAll("[data-col]");
  allCols.forEach((node) => {
    const key = node.getAttribute("data-col");
    node.style.display = state.visibleColumns.has(key) ? "" : "none";
  });
}

function getSortedFilteredData() {
  const rows = state.filtered.slice();
  rows.sort((a, b) => {
    if (state.tableSort === "issue_desc") return (b.IssueDate || "").localeCompare(a.IssueDate || "");
    if (state.tableSort === "issue_asc") return (a.IssueDate || "").localeCompare(b.IssueDate || "");
    if (state.tableSort === "payable_desc") return numberValue(b.PayableAmount) - numberValue(a.PayableAmount);
    if (state.tableSort === "payable_asc") return numberValue(a.PayableAmount) - numberValue(b.PayableAmount);
    if (state.tableSort === "invoice_desc") return (b.InvoiceID || "").localeCompare(a.InvoiceID || "");
    return (a.InvoiceID || "").localeCompare(b.InvoiceID || "");
  });
  return rows;
}

function paginateRows(rows) {
  const total = rows.length;
  const pageSize = Math.max(1, state.pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (state.pageIndex >= pageCount) state.pageIndex = pageCount - 1;
  const start = state.pageIndex * pageSize;
  const end = Math.min(total, start + pageSize);
  const paged = rows.slice(start, end);
  nodes.pageMeta.textContent = total === 0 ? "0-0 of 0" : `${start + 1}-${end} of ${total}`;
  nodes.prevPageBtn.disabled = state.pageIndex <= 0 || total === 0;
  nodes.nextPageBtn.disabled = state.pageIndex >= pageCount - 1 || total === 0;
  return paged;
}

function renderQualityMetrics(dataset) {
  if (!nodes.qualityMetrics) return;
  const missingBuyerTrn = dataset.filter((d) => !String(d.BuyerTRN || "").trim()).length;
  const missingDueDate = dataset.filter((d) => !String(d.DueDate || "").trim()).length;
  const nonPositivePayable = dataset.filter((d) => numberValue(d.PayableAmount) <= 0).length;
  const missingTaxProfile = dataset.filter((d) => {
    const taxes = state.taxByInvoice.get(d.InvoiceID);
    return !taxes || [...taxes].filter(Boolean).length === 0;
  }).length;
  const metrics = [
    ["Missing Buyer TRN", missingBuyerTrn],
    ["Missing Due Date", missingDueDate],
    ["Non-positive Payable", nonPositivePayable],
    ["Missing Tax Category", missingTaxProfile],
  ];
  nodes.qualityMetrics.innerHTML = metrics
    .map(([label, count]) => `<article class="quality-card"><p>${label}</p><h5>${count}</h5></article>`)
    .join("");
}

function escapeCsvCell(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function exportFilteredCsv() {
  const rows = getSortedFilteredData();
  const headers = TABLE_COLUMNS.map((c) => c.label);
  const body = rows.map((h) => [
    h.InvoiceID,
    h.InvoiceTypeCode,
    h.IssueDate,
    h.BuyerID,
    h.BuyerCountry,
    [...(state.taxByInvoice.get(h.InvoiceID) || [])].join(", "),
    h.PayableAmount,
    h.ErrorScenarioCode ? "Invalid" : "Valid",
    h.ErrorScenarioCode || "",
  ]);
  const csv = [headers, ...body].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_invoices.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${rows.length} filtered records to CSV.`);
}

function recomputeCoverageForCurrentMode() {
  state.coverageStats = new Map();
  const fields = nodes.invoiceMode.value === "commercial" ? [...TAXABLE_FIELDS, ...COMMERCIAL_EXTRA_FIELDS] : TAXABLE_FIELDS;
  state.headers.forEach((h) => {
    const lines = state.linesByInvoice.get(h.InvoiceID) || [];
    const vat = state.vatByInvoice.get(h.InvoiceID) || [];
    const src = getInvoiceSourceObject(h, lines, vat);
    const presentCount = fields.filter(([, , key]) => String(src[key] ?? "").trim() !== "").length;
    state.coverageStats.set(h.InvoiceID, { presentCount, missingCount: fields.length - presentCount, total: fields.length });
  });
}

function buildCoverageList() {
  const status = nodes.coverageStatusFilter.value;
  const sort = nodes.coverageSort.value;
  let list = state.filtered.map((h) => h.InvoiceID);
  if (status !== "all") {
    list = list.filter((id) => {
      const stat = state.coverageStats.get(id);
      if (!stat) return false;
      if (status === "missing") return stat.missingCount > 0;
      return stat.missingCount === 0;
    });
  }
  list.sort((a, b) => {
    const sa = state.coverageStats.get(a) || { missingCount: 0 };
    const sb = state.coverageStats.get(b) || { missingCount: 0 };
    if (sort === "missing_desc") return sb.missingCount - sa.missingCount || a.localeCompare(b);
    if (sort === "missing_asc") return sa.missingCount - sb.missingCount || a.localeCompare(b);
    if (sort === "invoice_desc") return b.localeCompare(a);
    return a.localeCompare(b);
  });
  state.coverageInvoiceIds = list;
}

function refreshCoverageNavigator() {
  if (!nodes.coverageInvoiceSelect) return;
  recomputeCoverageForCurrentMode();
  buildCoverageList();
  const options = state.coverageInvoiceIds
    .map((id) => {
      const stat = state.coverageStats.get(id) || { presentCount: 0, total: 0, missingCount: 0 };
      return `<option value="${id}">${id} (${stat.presentCount}/${stat.total}, missing ${stat.missingCount})</option>`;
    })
    .join("");
  nodes.coverageInvoiceSelect.innerHTML = options || `<option value="">No invoices in scope</option>`;
  if (state.selectedInvoice && state.coverageInvoiceIds.includes(state.selectedInvoice)) {
    nodes.coverageInvoiceSelect.value = state.selectedInvoice;
  } else if (state.coverageInvoiceIds.length > 0) {
    nodes.coverageInvoiceSelect.value = state.coverageInvoiceIds[0];
  }
  const noData = state.coverageInvoiceIds.length === 0;
  nodes.coveragePrevBtn.disabled = noData;
  nodes.coverageNextBtn.disabled = noData;
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

  state.pageIndex = 0;
  renderSummary(state.filtered);
  renderTable();
  refreshCoverageNavigator();
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
  renderQualityMetrics(dataset);
}

function rowStatusChip(header) {
  const cls = header.ErrorScenarioCode ? "invalid" : "valid";
  const text = header.ErrorScenarioCode ? "Invalid" : "Valid";
  return `<span class="chip ${cls}">${text}</span>`;
}

function renderTable() {
  nodes.invoiceTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const sorted = getSortedFilteredData();
  const rows = paginateRows(sorted);
  rows.forEach((h) => {
    const tr = document.createElement("tr");
    if (state.selectedInvoice === h.InvoiceID) tr.classList.add("selected");
    tr.innerHTML = `
      <td data-col="invoiceId">${h.InvoiceID}</td>
      <td data-col="type">${h.InvoiceTypeCode}</td>
      <td data-col="issueDate">${h.IssueDate}</td>
      <td data-col="buyer">${h.BuyerID}</td>
      <td data-col="country">${h.BuyerCountry}</td>
      <td data-col="tax">${[...(state.taxByInvoice.get(h.InvoiceID) || [])].join(", ")}</td>
      <td data-col="payable">${h.PayableAmount}</td>
      <td data-col="status">${rowStatusChip(h)}</td>
      <td data-col="scenario">${h.ErrorScenarioCode || "-"}</td>
    `;
    tr.addEventListener("click", () => selectInvoice(h.InvoiceID));
    fragment.appendChild(tr);
  });
  nodes.invoiceTableBody.appendChild(fragment);
  applyColumnVisibility();
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
  renderMandatoryMatrix(header, lines, vat);
  if (nodes.coverageInvoiceSelect && nodes.coverageInvoiceSelect.value !== invoiceId) {
    nodes.coverageInvoiceSelect.value = invoiceId;
  }
  renderTable();
}

function getInvoiceSourceObject(header, lines, vatRows) {
  const firstLine = lines[0] || {};
  const firstVat = vatRows[0] || {};
  if (state.sourceSchema === "mof") {
    const src = state.mofRowsByInvoice.get(header.InvoiceID) || [];
    return src[0] || {};
  }
  return {
    invoice_number: header.InvoiceID,
    invoice_date: header.IssueDate,
    invoice_type_code: header.InvoiceTypeCode,
    invoice_currency_code: header.CurrencyCode,
    invoice_transaction_type_code: "388",
    payment_due_date: header.DueDate,
    business_process_type: "",
    specification_identifier: "",
    payment_means_type_code: header.PaymentTermCode || "",
    seller_name: header.SellerID || "Synthetic Seller",
    seller_electronic_address: "",
    seller_electronic_identifier: "",
    seller_legal_registration_identifier: "",
    seller_legal_registration_identifier_type: "",
    seller_tax_registration_identifier: header.SellerTRN || "",
    seller_tax_scheme_code: "VAT",
    seller_address_line_1: "",
    seller_city: "",
    seller_country_subdivision: "",
    seller_country_code: "AE",
    buyer_name: header.BuyerID,
    buyer_electronic_address: header.BuyerTRN || "",
    buyer_electronic_identifier: "",
    buyer_legal_registration_identifier: "",
    buyer_legal_registration_identifier_type: "",
    buyer_address_line_1: "",
    buyer_city: "",
    buyer_country_subdivision: "",
    buyer_country_code: header.BuyerCountry,
    sum_of_invoice_line_net_amount: header.TaxExclusiveAmount,
    invoice_total_amount_without_tax: header.TaxExclusiveAmount,
    invoice_total_tax_amount: header.TaxAmount,
    invoice_total_amount_with_tax: header.TaxInclusiveAmount,
    amount_due_for_payment: header.PayableAmount,
    tax_category_taxable_amount: firstVat.TaxableAmount || "",
    tax_category_tax_amount: firstVat.TaxAmount || "",
    tax_category_code: firstVat.TaxCategory || "",
    tax_category_rate: firstVat.TaxRate || "",
    invoice_line_identifier: firstLine.LineNumber || "",
    invoiced_quantity: firstLine.Quantity || "",
    unit_of_measure_code: firstLine.UnitOfMeasure || "",
    invoice_line_net_amount: firstLine.LineExtensionAmount || "",
    item_net_price: firstLine.UnitPrice || "",
    item_gross_price: "",
    item_price_base_quantity: "1.000",
    invoiced_item_tax_category_code: firstLine.TaxCategory || "",
    invoiced_item_tax_rate: firstLine.TaxRate || "",
    vat_line_amount_in_aed: firstLine.TaxAmount || "",
    invoice_line_amount_in_aed: "",
    item_name: firstLine.ItemDescription || "",
    item_description: firstLine.ItemDescription || "",
  };
}

function getInvoiceLineModeRows(header, lines) {
  if (state.sourceSchema === "mof") {
    return (state.mofRowsByInvoice.get(header.InvoiceID) || []).map((r) => ({
      invoice_line_identifier: r.invoice_line_identifier,
      item_name: r.item_name,
      item_description: r.item_description,
      invoiced_quantity: r.invoiced_quantity,
      unit_of_measure_code: r.unit_of_measure_code,
      invoice_line_net_amount: r.invoice_line_net_amount,
      item_net_price: r.item_net_price,
      item_gross_price: r.item_gross_price,
      item_price_base_quantity: r.item_price_base_quantity,
      invoiced_item_tax_category_code: r.invoiced_item_tax_category_code,
      invoiced_item_tax_rate: r.invoiced_item_tax_rate,
      vat_line_amount_in_aed: r.vat_line_amount_in_aed,
      invoice_line_amount_in_aed: r.invoice_line_amount_in_aed,
    }));
  }
  return lines.map((ln) => ({
    invoice_line_identifier: ln.LineNumber,
    item_name: ln.ItemDescription,
    item_description: ln.ItemDescription,
    invoiced_quantity: ln.Quantity,
    unit_of_measure_code: ln.UnitOfMeasure,
    invoice_line_net_amount: ln.LineExtensionAmount,
    item_net_price: ln.UnitPrice,
    item_gross_price: "",
    item_price_base_quantity: "1.000",
    invoiced_item_tax_category_code: ln.TaxCategory,
    invoiced_item_tax_rate: ln.TaxRate,
    vat_line_amount_in_aed: ln.TaxAmount,
    invoice_line_amount_in_aed: "",
  }));
}

function renderMandatoryMatrix(header, lines, vatRows) {
  const mode = nodes.invoiceMode.value;
  const source = getInvoiceSourceObject(header, lines, vatRows);
  const fields = mode === "commercial" ? [...TAXABLE_FIELDS, ...COMMERCIAL_EXTRA_FIELDS] : TAXABLE_FIELDS;
  const rowsHtml = fields
    .map(([num, label, key]) => {
      const value = source[key] ?? "";
      const present = String(value).trim() !== "";
      return `<tr>
        <td>${num}</td>
        <td>${label}</td>
        <td>${key}</td>
        <td class="${present ? "ok" : "miss"}">${present ? "Present" : "Missing"}</td>
        <td>${present ? String(value) : "-"}</td>
      </tr>`;
    })
    .join("");
  const presentCount = fields.filter(([, , key]) => String(source[key] ?? "").trim() !== "").length;
  const missingCount = fields.length - presentCount;
  state.coverageStats.set(header.InvoiceID, { presentCount, missingCount, total: fields.length });
  if (nodes.coverageHint) {
    nodes.coverageHint.textContent = `Coverage for ${header.InvoiceID}: ${presentCount}/${fields.length} present, ${missingCount} missing.`;
  }
  nodes.mandatoryMatrix.innerHTML = `
    <h5>
      Mandatory Field Coverage (${mode === "commercial" ? "Commercial XML 1-51" : "Taxable E-Invoice 1-41"}):
      ${presentCount}/${fields.length}
    </h5>
    <table class="mandatory-table">
      <thead>
        <tr><th>No.</th><th>Field</th><th>Key</th><th>Status</th><th>Value</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function renderInvoicePreview(header, lines, vatRows) {
  if (!header) {
    nodes.invoicePreview.innerHTML = "";
    return;
  }
  const mode = nodes.invoiceMode.value;
  const src = getInvoiceSourceObject(header, lines, vatRows);
  const modeLines = getInvoiceLineModeRows(header, lines);
  const lineRows =
    mode === "commercial"
      ? modeLines
          .map(
            (ln) => `<tr>
        <td>${ln.invoice_line_identifier}</td>
        <td>${ln.item_name}</td>
        <td>${ln.item_description}</td>
        <td>${ln.invoiced_quantity}</td>
        <td>${ln.unit_of_measure_code}</td>
        <td>${ln.item_net_price || "-"}</td>
        <td>${ln.item_gross_price || "-"}</td>
        <td>${ln.item_price_base_quantity || "-"}</td>
        <td>${ln.invoiced_item_tax_category_code}</td>
        <td>${ln.invoiced_item_tax_rate}</td>
        <td>${ln.vat_line_amount_in_aed || "-"}</td>
        <td>${ln.invoice_line_amount_in_aed || "-"}</td>
      </tr>`,
          )
          .join("")
      : modeLines
          .map(
            (ln) => `<tr>
        <td>${ln.invoice_line_identifier}</td>
        <td>${ln.item_description}</td>
        <td>${ln.invoiced_quantity}</td>
        <td>${ln.unit_of_measure_code}</td>
        <td>${ln.invoice_line_net_amount}</td>
        <td>${ln.invoiced_item_tax_category_code}</td>
        <td>${ln.invoiced_item_tax_rate}</td>
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
        <h4 style="margin:0;">${mode === "commercial" ? "Commercial XML Invoice Preview" : "Taxable E-Invoice Preview"}</h4>
        <div style="font-size:0.83rem;color:#456356;">${header.InvoiceID}</div>
      </div>
      <img class="preview-logo" src="./assets/dariba-tech-logo.png" alt="Dariba Tech" />
    </div>
    <div class="preview-sections">
      <details class="preview-section" open>
        <summary>Document Header</summary>
        <div class="preview-grid">
          <div><strong>Invoice No:</strong> ${src.invoice_number || header.InvoiceID}</div>
          <div><strong>Invoice Date:</strong> ${src.invoice_date || header.IssueDate}</div>
          <div><strong>Type Code:</strong> ${src.invoice_type_code || header.InvoiceTypeCode}</div>
          <div><strong>Currency:</strong> ${src.invoice_currency_code || header.CurrencyCode}</div>
          <div><strong>Transaction Type:</strong> ${src.invoice_transaction_type_code || "-"}</div>
          <div><strong>Due Date:</strong> ${src.payment_due_date || header.DueDate}</div>
          <div><strong>Business Process:</strong> ${src.business_process_type || "-"}</div>
          <div><strong>Specification ID:</strong> ${src.specification_identifier || "-"}</div>
          <div><strong>Payment Means:</strong> ${src.payment_means_type_code || "-"}</div>
          <div><strong>Status:</strong> ${header.InvoiceStatus || "ISSUED"}</div>
        </div>
      </details>
      <details class="preview-section" open>
        <summary>Seller / Buyer</summary>
        <div class="preview-grid">
          <div><strong>Seller Name:</strong> ${src.seller_name || "-"}</div>
          <div><strong>Seller Tax ID:</strong> ${src.seller_tax_registration_identifier || "-"}</div>
          <div><strong>Seller e-Address:</strong> ${src.seller_electronic_address || "-"}</div>
          <div><strong>Seller Scheme:</strong> ${src.seller_electronic_identifier || "-"}</div>
          <div><strong>Seller City:</strong> ${src.seller_city || "-"}</div>
          <div><strong>Seller Country:</strong> ${src.seller_country_code || "-"}</div>
          <div><strong>Buyer Name:</strong> ${src.buyer_name || "-"}</div>
          <div><strong>Buyer Country:</strong> ${src.buyer_country_code || "-"}</div>
          <div><strong>Buyer e-Address:</strong> ${src.buyer_electronic_address || "-"}</div>
          <div><strong>Buyer e-Identifier:</strong> ${src.buyer_electronic_identifier || "-"}</div>
        </div>
      </details>
      <details class="preview-section" open>
        <summary>Invoice Lines (${mode === "commercial" ? "Commercial 4.2 Expanded" : "Taxable 4.1 Core"})</summary>
        <div>
          <table class="preview-table">
            <thead>
              ${
                mode === "commercial"
                  ? "<tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th>UoM</th><th>Item Net</th><th>Item Gross</th><th>Base Qty</th><th>Tax Cat</th><th>Rate</th><th>VAT AED</th><th>Line AED</th></tr>"
                  : "<tr><th>#</th><th>Description</th><th>Qty</th><th>UoM</th><th>Line Net</th><th>Tax Cat</th><th>Rate</th></tr>"
              }
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
        </div>
      </details>
      <details class="preview-section" open>
        <summary>VAT Breakdown</summary>
        <div>
          <table class="preview-table">
            <thead>
              <tr><th>Tax Cat</th><th>Rate</th><th>Taxable</th><th>Tax</th></tr>
            </thead>
            <tbody>${vatRowsHtml}</tbody>
          </table>
        </div>
      </details>
      <details class="preview-section" open>
        <summary>Totals</summary>
        <div class="preview-grid">
          <div><strong>Tax Exclusive:</strong> ${src.invoice_total_amount_without_tax || header.TaxExclusiveAmount}</div>
          <div><strong>Tax Amount:</strong> ${src.invoice_total_tax_amount || header.TaxAmount}</div>
          <div><strong>Tax Inclusive:</strong> ${src.invoice_total_amount_with_tax || header.TaxInclusiveAmount}</div>
          <div><strong>Payable:</strong> ${src.amount_due_for_payment || header.PayableAmount}</div>
        </div>
      </details>
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
  const mode = nodes.invoiceMode.value;
  const doc = new jsPDF();
  headers.forEach((header, idx) => {
    if (idx > 0) doc.addPage();
    const lines = state.linesByInvoice.get(header.InvoiceID) || [];
    const vats = state.vatByInvoice.get(header.InvoiceID) || [];
    const src = getInvoiceSourceObject(header, lines, vats);
    const modeLines = getInvoiceLineModeRows(header, lines);
    let y = 14;
    doc.setFontSize(16);
    doc.text(`Dariba Tech - ${mode === "commercial" ? "Commercial XML" : "Taxable E-Invoice"}`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Invoice ID: ${src.invoice_number || header.InvoiceID}`, 14, y);
    doc.text(`Type: ${src.invoice_type_code || header.InvoiceTypeCode}`, 130, y);
    y += 6;
    doc.text(`Issue Date: ${src.invoice_date || header.IssueDate}`, 14, y);
    doc.text(`Due Date: ${src.payment_due_date || header.DueDate}`, 130, y);
    y += 6;
    doc.text(`Seller: ${src.seller_name || "-"} | Tax ID: ${src.seller_tax_registration_identifier || "-"}`, 14, y);
    y += 6;
    doc.text(`Buyer: ${src.buyer_name || header.BuyerID} (${src.buyer_country_code || header.BuyerCountry})`, 14, y);
    y += 8;
    doc.text("Lines:", 14, y);
    y += 6;
    modeLines.forEach((ln) => {
      const lineText =
        mode === "commercial"
          ? `${ln.invoice_line_identifier}. ${ln.item_name} | Qty ${ln.invoiced_quantity} ${ln.unit_of_measure_code} | Net ${ln.item_net_price || "-"} | Gross ${ln.item_gross_price || "-"} | Tax ${ln.invoiced_item_tax_category_code}@${ln.invoiced_item_tax_rate}`
          : `${ln.invoice_line_identifier}. ${ln.item_description} | Qty ${ln.invoiced_quantity} | Tax ${ln.invoiced_item_tax_category_code}@${ln.invoiced_item_tax_rate} | Line ${ln.invoice_line_net_amount}`;
      doc.text(
        lineText,
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
    doc.text(`Tax Exclusive: ${src.invoice_total_amount_without_tax || header.TaxExclusiveAmount}`, 14, y);
    y += 5;
    doc.text(`Tax Amount: ${src.invoice_total_tax_amount || header.TaxAmount}`, 14, y);
    y += 5;
    doc.text(`Tax Inclusive: ${src.invoice_total_amount_with_tax || header.TaxInclusiveAmount}`, 14, y);
    y += 5;
    doc.text(`Payable: ${src.amount_due_for_payment || header.PayableAmount}`, 14, y);
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
    try {
      const [headers, lines, vats] = await Promise.all([
        loadCSV(`${base}/invoice_headers.csv`),
        loadCSV(`${base}/invoice_lines.csv`),
        loadCSV(`${base}/invoice_vat_breakdown.csv`),
      ]);
      state.headers = headers;
      state.lines = lines;
      state.vats = vats;
      state.sourceSchema = "brd";
      state.mofRowsByInvoice = new Map();
      setChecklist(new Map([["invoice_headers.csv", true], ["invoice_lines.csv", true], ["invoice_vat_breakdown.csv", true]]));
      nodes.schemaDetected.textContent = "Schema: BRD split files";
    } catch {
      const mofRows = await loadCSV(`${base}/mof_schema_dataset.csv`);
      loadFromMofRows(mofRows);
      setChecklist(new Map([["mof_schema_dataset.csv", true]]));
      nodes.schemaDetected.textContent = "Schema: MoF flat file";
    }
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
    refreshCoverageNavigator();
  } catch (err) {
    setUploadState("error", "Load failed");
    setStatus(`Load failed: ${err.message}. Run via local server (not file://).`, true);
  }
}

function loadFromMofRows(mofRows) {
  const byInvoice = new Map();
  mofRows.forEach((r) => {
    const inv = r.invoice_number;
    if (!byInvoice.has(inv)) byInvoice.set(inv, []);
    byInvoice.get(inv).push(r);
  });

  const headers = [];
  const lines = [];
  const vats = [];

  byInvoice.forEach((rows, inv) => {
    const f = rows[0];
    headers.push({
      InvoiceID: inv,
      InvoiceTypeCode: f.invoice_type_code,
      InvoiceStatus: "ISSUED",
      IssueDate: f.invoice_date,
      DueDate: f.payment_due_date,
      CurrencyCode: f.invoice_currency_code,
      SellerID: f.seller_name,
      SellerTRN: f.seller_tax_registration_identifier,
      BuyerID: f.buyer_name,
      BuyerTRN: f.buyer_electronic_address,
      BuyerCountry: f.buyer_country_code,
      PaymentTermCode: f.payment_means_type_code,
      OriginalInvoiceID: "",
      TaxExclusiveAmount: f.invoice_total_amount_without_tax,
      TaxAmount: f.invoice_total_tax_amount,
      TaxInclusiveAmount: f.invoice_total_amount_with_tax,
      PayableAmount: f.amount_due_for_payment,
      ErrorScenarioCode: f.error_scenario_code || "",
    });
    rows.forEach((r) => {
      lines.push({
        LineID: `${inv}-${r.invoice_line_identifier}`,
        InvoiceID: inv,
        LineNumber: r.invoice_line_identifier,
        ItemCode: r.item_name,
        ItemDescription: r.item_description,
        Quantity: r.invoiced_quantity,
        UnitOfMeasure: r.unit_of_measure_code,
        UnitPrice: r.item_net_price,
        LineAllowanceAmount: "0.00",
        LineChargeAmount: "0.00",
        LineExtensionAmount: r.invoice_line_net_amount,
        TaxCategory: r.invoiced_item_tax_category_code,
        TaxRate: r.invoiced_item_tax_rate,
        TaxAmount: r.vat_line_amount_in_aed,
        ErrorScenarioCode: r.error_scenario_code || "",
      });
    });
    const taxMap = new Map();
    rows.forEach((r) => {
      const key = `${r.tax_category_code}|${r.tax_category_rate}`;
      if (!taxMap.has(key)) {
        taxMap.set(key, {
          InvoiceID: inv,
          TaxCategory: r.tax_category_code,
          TaxRate: r.tax_category_rate,
          TaxableAmount: r.tax_category_taxable_amount,
          TaxAmount: r.tax_category_tax_amount,
          ErrorScenarioCode: r.error_scenario_code || "",
        });
      }
    });
    vats.push(...taxMap.values());
  });

  state.headers = headers;
  state.lines = lines;
  state.vats = vats;
  state.sourceSchema = "mof";
  state.mofRowsByInvoice = byInvoice;
}

async function stageFromFiles(fileList) {
  const files = Array.from(fileList || []);
  const needed = ["invoice_headers.csv", "invoice_lines.csv", "invoice_vat_breakdown.csv"];
  const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
  setChecklist(byName);
  if (byName.has("mof_schema_dataset.csv")) {
    try {
      const text = await readFileAsText(byName.get("mof_schema_dataset.csv"));
      const mofRows = parseCSV(text);
      if (mofRows.length === 0) {
        setUploadState("error", "MoF file has no rows");
        nodes.preloadSummary.textContent = "mof_schema_dataset.csv is empty.";
        return;
      }
      const reqMof = TAXABLE_FIELDS.map(([, , key]) => key);
      const missMof = missingColumns(mofRows, reqMof);
      if (missMof.length) {
        setUploadState("error", "MoF schema validation failed");
        nodes.preloadSummary.textContent = `MoF file missing columns: ${missMof.join(", ")}`;
        nodes.schemaDetected.textContent = "Schema: MoF flat file (invalid)";
        return;
      }
      state.stagedFiles = { mode: "mof", mofRows };
      const invoiceCount = new Set(mofRows.map((r) => r.invoice_number)).size;
      nodes.preloadSummary.textContent = `Verified MoF file: rows=${mofRows.length}, distinct invoices=${invoiceCount}. Click "Run Dataset" to apply.`;
      setUploadState("staged", "Uploaded and verified");
      nodes.schemaDetected.textContent = "Schema: MoF flat file";
      setStatus("MoF dataset uploaded and verified. Ready to run.");
      return;
    } catch (err) {
      setUploadState("error", "MoF file parsing failed");
      nodes.schemaDetected.textContent = "Schema: MoF flat file (error)";
      setStatus(`File parsing failed: ${err.message}`, true);
      return;
    }
  }
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
    state.stagedFiles = { mode: "brd", headers, lines, vats };
    nodes.preloadSummary.textContent =
      `Verified files: headers=${headers.length} rows, lines=${lines.length} rows, vat=${vats.length} rows, distinct invoices=${invoiceCount}. Click "Run Dataset" to apply.`;
    setUploadState("staged", "Uploaded and verified");
    nodes.schemaDetected.textContent = "Schema: BRD split files";
    setStatus("Files uploaded and verified. Ready to run.");
  } catch (err) {
    setUploadState("error", "File parsing failed");
    setStatus(`File parsing failed: ${err.message}`, true);
  }
}

function loadStagedDataset() {
  if (!state.stagedFiles) return false;
  if (state.stagedFiles.mode === "mof") {
    loadFromMofRows(state.stagedFiles.mofRows);
  } else {
    state.headers = state.stagedFiles.headers;
    state.lines = state.stagedFiles.lines;
    state.vats = state.stagedFiles.vats;
    state.sourceSchema = "brd";
    state.mofRowsByInvoice = new Map();
  }
  buildIndexes();
  populateSelectOptions();
  state.selectedInvoice = null;
  applyFilters();
  if (state.filtered.length > 0) selectInvoice(state.filtered[0].InvoiceID);
  setUploadState("loaded", "Staged files loaded");
  setStatus(`Loaded staged dataset: ${state.headers.length} headers, ${state.lines.length} lines.`);
  refreshCoverageNavigator();
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
  nodes.tableSort.addEventListener("change", () => {
    state.tableSort = nodes.tableSort.value;
    state.pageIndex = 0;
    renderTable();
  });
  nodes.pageSize.addEventListener("change", () => {
    state.pageSize = Number(nodes.pageSize.value) || 25;
    state.pageIndex = 0;
    renderTable();
  });
  nodes.prevPageBtn.addEventListener("click", () => {
    if (state.pageIndex <= 0) return;
    state.pageIndex -= 1;
    renderTable();
  });
  nodes.nextPageBtn.addEventListener("click", () => {
    state.pageIndex += 1;
    renderTable();
  });
  nodes.resetFiltersBtn.addEventListener("click", resetFilters);
  document.querySelectorAll(".preset-btn[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.getAttribute("data-preset")));
  });
  nodes.saveViewBtn.addEventListener("click", saveCurrentView);
  nodes.loadViewBtn.addEventListener("click", loadSelectedView);
  nodes.deleteViewBtn.addEventListener("click", deleteSelectedView);
  nodes.exportFilteredBtn.addEventListener("click", exportFilteredCsv);
  nodes.columnToggles.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const key = target.getAttribute("data-col-toggle");
    if (!key) return;
    if (target.checked) {
      state.visibleColumns.add(key);
    } else {
      state.visibleColumns.delete(key);
    }
    applyColumnVisibility();
  });
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
  nodes.invoiceMode.addEventListener("change", () => {
    if (state.selectedInvoice) {
      const header = state.headers.find((h) => h.InvoiceID === state.selectedInvoice);
      const lines = state.linesByInvoice.get(state.selectedInvoice) || [];
      const vat = state.vatByInvoice.get(state.selectedInvoice) || [];
      if (header) {
        renderInvoicePreview(header, lines, vat);
        renderMandatoryMatrix(header, lines, vat);
      }
    }
    refreshCoverageNavigator();
  });
  nodes.coverageStatusFilter.addEventListener("change", refreshCoverageNavigator);
  nodes.coverageSort.addEventListener("change", refreshCoverageNavigator);
  nodes.coverageInvoiceSelect.addEventListener("change", () => {
    const id = nodes.coverageInvoiceSelect.value;
    if (id) selectInvoice(id);
  });
  nodes.coveragePrevBtn.addEventListener("click", () => {
    if (!state.selectedInvoice || state.coverageInvoiceIds.length === 0) return;
    const idx = state.coverageInvoiceIds.indexOf(state.selectedInvoice);
    const nextIdx = idx <= 0 ? 0 : idx - 1;
    selectInvoice(state.coverageInvoiceIds[nextIdx]);
  });
  nodes.coverageNextBtn.addEventListener("click", () => {
    if (!state.selectedInvoice || state.coverageInvoiceIds.length === 0) return;
    const idx = state.coverageInvoiceIds.indexOf(state.selectedInvoice);
    const nextIdx = idx < 0 ? 0 : Math.min(state.coverageInvoiceIds.length - 1, idx + 1);
    selectInvoice(state.coverageInvoiceIds[nextIdx]);
  });
  document.querySelectorAll(".panel-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const panelBody = document.getElementById(targetId);
      if (!panelBody) return;
      const isCollapsed = panelBody.classList.toggle("collapsed");
      btn.textContent = isCollapsed ? ">" : "v";
      btn.setAttribute("aria-expanded", String(!isCollapsed));
    });
  });
}

wireEvents();
loadSavedViews();
renderColumnToggles();
applyColumnVisibility();
state.tableSort = nodes.tableSort.value;
state.pageSize = Number(nodes.pageSize.value) || 25;
setUploadState("idle", "No files staged");
nodes.pdfMaxDocs.disabled = true;
setChecklist(new Map());
