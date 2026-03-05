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

## Schema Alignment Status

The BRD-baseline generator (`generate_uae_einvoicing_dataset.py`) supports structured positive and negative testing for the cleaned BRD model.
The MoF-schema-first generator (`generate_mof_schema_dataset.py`) is used for explicit 51-field mandatory schema alignment scenarios.

## Branch and Version Control

Work is currently on:

- `feature/mof-schema-alignment`

The repository was initialized locally and committed in checkpoints to support rollback and controlled iteration.
