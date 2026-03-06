# UAE Synthetic Data E-Invoicing

This repository contains working artifacts for a UAE e-invoicing synthetic dataset initiative, including:

- BRD cleanup draft
- synthetic data generator script
- sample positive/negative MoF-aligned test records
- generated dataset outputs for pilot and full-scale runs

## What Was Added

The generator script:

- `generate_uae_einvoicing_dataset.py`
- `generate_mof_schema_dataset.py`

produces a delivery package per run with:

- `invoice_headers.csv`
- `invoice_lines.csv`
- `invoice_vat_breakdown.csv`
- `customers.csv`
- `items.csv`
- `error_scenarios.csv`
- `generation_config.json`
- `run_manifest.json`
- `README.md` (run-level)

MoF schema-first runs additionally produce:

- `mof_schema_dataset.csv` (flat row-per-line file aligned to 51 mandatory MoF fields)
- `generation_config.json`
- `run_manifest.json`
- `README.md` (run-level)

## Controlled Scale-Up Runs

A staged run approach was executed under `output_pilot/`:

- `run_20260305T222347Z_20260303` (`100` documents)
- `run_20260305T222552Z_20260303` (`1,000` documents)
- `run_20260305T222747Z_20260303` (`5,000` documents)

Observed gate results:

- configured invoice/credit note mix achieved
- configured invalid share achieved (`4%`)
- valid-document reconciliation failures: `0` across pilot, medium, and full runs

## MoF Schema-First Runs

To align with the updated UAE MoF JSON schema, a dedicated generator was added:

- `generate_mof_schema_dataset.py`

This generator:

- emits all 51 mandatory MoF field columns in a single flat dataset,
- supports controlled positive/negative scenario distribution,
- labels failing records with `error_scenario_code`.

Generated outputs are under `output_mof/`:

- `mof_run_20260305T224707Z_20260306` (pilot)
- `mof_run_20260305T224744Z_20260306` (full)

Current full MoF run profile:

- total documents: `5,000`
- positive documents: `4,250` (`85%`)
- negative documents: `750` (`15%`)
- positive reconciliation failures: `0`

## How To Generate

From repository root:

```powershell
python generate_uae_einvoicing_dataset.py --n-documents 100 --output-dir output_pilot
python generate_uae_einvoicing_dataset.py --n-documents 1000 --output-dir output_pilot
python generate_uae_einvoicing_dataset.py --n-documents 5000 --output-dir output_pilot
python generate_mof_schema_dataset.py --n-documents 5000 --invalid-share 0.15 --output-dir output_mof
```

## Data Viewer (Frontend)

A lightweight frontend viewer is available under `ui/` to explore generated datasets with filtering by:

- invoice type (`380` / `381`)
- tax category (`S`, `Z`, `E`)
- validation status (valid/invalid)
- scenario code
- buyer country
- date range
- payable amount range and segment

Latest UI capabilities include:

- Dariba-branded UI theme and logo integration
- section-level expand/collapse toggles across all major panels
- drag-and-drop upload with checklist and schema detection
- staged/verified/loaded/error upload states with row-count summaries
- quick filter preset chips (`all`, `valid`, `invalid`, `380`, `381`, `high value`)
- invoice mode switch:
  - `Taxable E-Invoice (Mandatory 4.1)`
  - `Commercial XML (Mandatory 1-51)`
- mandatory field coverage matrix with present/missing status
- coverage navigator for bulk invoice review:
  - invoice selector
  - missing-only/complete-only filtering
  - sort by missing count
  - previous/next navigation
- PDF preview before download
- PDF scope controls (`selected` vs `filtered`) with max-document guardrail
- sortable and paginated results table with page-size controls
- configurable visible table columns via toggle panel
- saved filter views (browser local storage)
- filtered dataset CSV export for handoff/review
- data quality insight cards over filtered scope (missing key fields and profile gaps)

## Latest Checkpoint (UI Enhancements + Smoke Test)

Latest checkpoint includes:

- quick presets, saved views, sortable/paginated table, and visible-column toggles
- filtered CSV export and summary data-quality insight cards
- section toggle/icon cleanup and encoding fix

Smoke-tested locally on March 6, 2026 by:

- JavaScript syntax check (`node --check ui/app.js`)
- temporary local HTTP serve + content checks for `/`, `/app.js`, `/styles.css`

To run locally:

```powershell
cd ui
python -m http.server 8080
```

Then open:

`http://localhost:8080`

Default dataset path in the UI points to:

`../output_pilot/run_20260305T222747Z_20260303`

You can replace this path in the viewer to load any run folder containing:

- `invoice_headers.csv`
- `invoice_lines.csv`
- `invoice_vat_breakdown.csv`

Or load a MoF flat dataset file via drag-and-drop:

- `mof_schema_dataset.csv`

## Schema Alignment Status

The BRD-baseline generator (`generate_uae_einvoicing_dataset.py`) supports structured positive and negative testing for the cleaned BRD model.
The MoF-schema-first generator (`generate_mof_schema_dataset.py`) is used for explicit 51-field mandatory schema alignment scenarios.

## Branch and Version Control

Work is currently on:

- `feature/mof-schema-alignment`

The repository was initialized locally and committed in checkpoints to support rollback and controlled iteration.
