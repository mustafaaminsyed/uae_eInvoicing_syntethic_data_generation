# UAE Synthetic Data E-Invoicing

This repository contains working artifacts for a UAE e-invoicing synthetic dataset initiative, including:

- BRD cleanup draft
- synthetic data generator script
- sample positive/negative MoF-aligned test records
- generated dataset outputs for pilot and full-scale runs

## What Was Added

The generator script:

- `generate_uae_einvoicing_dataset.py`

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

## Controlled Scale-Up Runs

A staged run approach was executed under `output_pilot/`:

- `run_20260305T222347Z_20260303` (`100` documents)
- `run_20260305T222552Z_20260303` (`1,000` documents)
- `run_20260305T222747Z_20260303` (`5,000` documents)

Observed gate results:

- configured invoice/credit note mix achieved
- configured invalid share achieved (`4%`)
- valid-document reconciliation failures: `0` across pilot, medium, and full runs

## How To Generate

From repository root:

```powershell
python generate_uae_einvoicing_dataset.py --n-documents 100 --output-dir output_pilot
python generate_uae_einvoicing_dataset.py --n-documents 1000 --output-dir output_pilot
python generate_uae_einvoicing_dataset.py --n-documents 5000 --output-dir output_pilot
```

## Schema Alignment Status

The current generator baseline aligns with the cleaned BRD and supports structured positive and negative testing.
Alignment against the latest MoF-style 51-field schema is partial and requires a schema-first enhancement pass to add missing compliance fields and explicit rule-level outputs.

## Branch and Version Control

Work is currently on:

- `feature/mof-schema-alignment`

The repository was initialized locally and committed in checkpoints to support rollback and controlled iteration.
