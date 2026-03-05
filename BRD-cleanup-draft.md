# UAE E-Invoicing Synthetic Data Program

## Business Requirements Document

Source document: `Dariba Tech - E-Invoicing Syntethic Data Generation Requirements Doc - V1 0 14022026.docx`

Working approach: this Markdown file is the cleanup draft. The source `.docx` remains unchanged until the content is fully reviewed and approved.

Prepared by Dariba Technologies LLC

Draft status: Cleanup in progress

---

## Executive Summary

This document defines a synthetic data framework for generating realistic UAE e-invoicing datasets aligned with UAE VAT rules and the expected UAE e-invoicing model based on PINT-AE and Peppol BIS Billing 3.0.

The purpose of the dataset is to support product development, validation, testing, and demonstration without using real taxpayer or production data.

The framework separates:

- behavioural transaction generation,
- VAT and compliance enforcement, and
- structural readiness for downstream e-invoicing transformation.

This separation is intended to produce datasets that are both commercially realistic and technically reliable for:

- data readiness validation,
- rule engine testing,
- reconciliation and exception workflows,
- analytics development, and
- downstream XML transformation pipelines.

The output dataset is designed to be:

- fully synthetic,
- configurable,
- reproducible,
- structurally complete for downstream UBL generation, and
- suitable for controlled positive and negative test scenarios.

---

## A. Glossary of Terms and Definitions

| Term | Definition |
| --- | --- |
| AED | United Arab Emirates Dirham. The base currency for invoices generated under this specification. |
| Behavioural Generation Layer | The stage of synthetic data generation responsible for modelling realistic commercial activity, including customers, items, volumes, quantities, pricing patterns, and transaction timing, before compliance rules are applied. |
| Compliance Layer | The stage of synthetic data generation responsible for applying deterministic tax logic, totals, rounding, mandatory field rules, and other regulatory controls to generated transactions. |
| Credit Note (`InvoiceTypeCode = 381`) | A document issued to adjust, partially reverse, or fully cancel a previously issued invoice. |
| Deterministic Reproducibility | The ability to generate the same dataset when the same input parameters and random seed values are used. |
| Error Scenario Code | A field included in the dataset to identify intentionally injected invalid or negative test scenarios. |
| Invoice (`InvoiceTypeCode = 380`) | A standard tax invoice representing a commercial sale or service transaction. |
| Invoice Header | The document-level portion of an invoice containing document identifiers, dates, party information, totals, status, and high-level VAT breakdown. |
| Invoice Line | An individual commercial line item within an invoice, containing item description, quantity, unit price, line amount, and VAT classification. |
| Invoice Status | The lifecycle status of a document, for example `ISSUED`, `CANCELLED`, or `SUPERSEDED`. |
| Invoice Type Code | A coded identifier indicating the document type. `380` = invoice, `381` = credit note. |
| Line Extension Amount | The monetary value of an invoice line before VAT, typically calculated as quantity multiplied by unit price, adjusted for any applicable line-level allowances or charges. |
| Peppol BIS Billing 3.0 | The Peppol Business Interoperability Specification for electronic invoicing that defines structured invoice data elements and business rules. |
| PINT-AE | The UAE-specific Peppol International invoice model expected to define the local invoice profile and data requirements for UAE e-invoicing. |
| Referential Integrity | The requirement that relationships between entities, such as invoice headers, invoice lines, customers, and referenced invoices, remain valid and consistent across the dataset. |
| Seller | The synthetic UAE-registered entity issuing invoices in the dataset. |
| Seller TRN | The synthetic Tax Registration Number assigned to the seller. It must be structurally valid for testing purposes but must not be a real taxpayer TRN. |
| Synthetic Dataset | A fully artificial dataset generated to simulate realistic business and tax scenarios without using real production or customer data. |
| Tax Category | The VAT classification applied to a line or aggregated amount, for example `S` (standard-rated), `Z` (zero-rated), or `E` (exempt). |
| Tax Exclusive Amount | The total invoice amount before VAT is applied. |
| Tax Inclusive Amount | The total invoice amount including VAT. |
| Tax Rate | The VAT percentage applied to a taxable amount, for example `5%` for standard-rated supplies. |
| UBL (Universal Business Language) | An XML-based standard used to represent structured business documents such as invoices. |
| VAT (Value Added Tax) | The indirect tax applied to goods and services in the UAE, including standard-rated, zero-rated, and exempt treatments defined by UAE law. |
| VAT Breakdown | The aggregation of taxable amounts and VAT amounts per tax category at invoice level. |

---

## 1. Purpose and Background

### 1.1 Purpose

The UAE is implementing a structured e-invoicing framework aligned with the Peppol five-corner model and a UAE-specific PINT-AE profile derived from Peppol BIS Billing 3.0.

Organisations building e-invoicing solutions for the UAE need realistic test data to:

- validate ERP data readiness,
- test transformation and mapping pipelines,
- develop business and regulatory rule engines,
- exercise reconciliation and exception handling workflows, and
- support internal demonstrations and architecture validation.

Production ERP data is not suitable for these purposes because it may contain confidential, personal, or commercially sensitive information. At the same time, simplistic mock data does not adequately represent the behavioural and compliance complexity required for meaningful testing.

This document therefore defines the requirements for a high-fidelity synthetic data framework that produces realistic, fully synthetic invoice datasets suitable for engineering, product, compliance, and demonstration use cases.

### 1.2 Background

The dataset produced under this specification must be realistic enough to emulate the structure and behaviour of operational invoice data while remaining safe for unrestricted internal and external demonstration use.

The framework is intended to support:

- platform engineering teams implementing ingestion and transformation pipelines,
- data teams building readiness and quality tooling,
- compliance teams validating VAT and e-invoicing rules, and
- solution and pre-sales teams preparing controlled demonstrations.

The synthetic data must go beyond generic mock invoices. It must reflect how businesses issue invoices over time, including repeat customers, stable product usage, non-uniform transaction volumes, mixed VAT treatment, credit note relationships, and known negative test cases.

### 1.3 Design Intent

The synthetic data framework must produce datasets that are:

- behaviourally realistic,
- VAT-consistent under the simplified UAE VAT rules defined in this document,
- structurally ready for downstream transformation into UBL 2.1 / Peppol invoice documents,
- reproducible through fixed configuration and seed values, and
- configurable for multiple business profiles and future extensions.

For this phase, the objective is validation-grade realism for platform testing and regulatory simulation. The document does not attempt to model the full legal complexity of every UAE VAT scenario.

---

## 2. Overall Aim

The overall aim of this project is to create a configurable and repeatable synthetic data generation framework that produces high-fidelity UAE e-invoicing datasets suitable for operational testing, product validation, and regulatory-oriented simulation.

The framework must generate datasets that:

- reflect realistic commercial behaviour, including customer concentration, repeat purchasing, seasonality, and non-uniform document volumes,
- apply deterministic UAE VAT treatment under the simplified rules defined in this document,
- preserve referential integrity across transactional and supporting data,
- provide controlled negative scenarios for validation testing, and
- contain all fields required for downstream transformation into UBL 2.1 / Peppol invoice documents without additional enrichment.

The framework must support multiple configurable business profiles over time, starting with an initial UAE B2B professional services profile.

---

## 3. Key Objectives

### 3.1 Replicate realistic business behaviour

The dataset must emulate how organisations issue invoices in live operational systems. This includes:

- non-uniform invoice volumes across time,
- realistic variation in invoice line counts and document values,
- repeated purchasing behaviour by the same customers,
- stable customer identities and stable item catalogues,
- realistic concentration of volume among a subset of customers, and
- plausible clustering of items and price ranges by customer and industry segment.

The expected outcome is that analytics run on the dataset show recognisable business patterns rather than random or uniform distributions.

### 3.2 Model simplified UAE VAT treatment accurately

The VAT logic in this specification is intentionally simplified. It is designed for validation-grade testing and behavioural realism, not full legal coverage of every UAE VAT scenario.

The initial scope includes:

- standard-rated supplies,
- zero-rated exports and qualifying international services under the simplified rule set, and
- exempt items defined in the item catalogue.

The initial scope excludes advanced VAT cases such as reverse charge, margin schemes, special real-estate rules, and deemed supplies.

Within this simplified scope, valid records must still be fully deterministic and internally correct.

### 3.3 Support regulatory and technical validation

The dataset must be directly usable for:

- data completeness and readiness checks,
- rule engine validation,
- reconciliation testing,
- field mapping to PINT-AE-aligned structures,
- downstream XML transformation, and
- UI flows for remediation and exception handling.

### 3.4 Enable positive, negative, and edge-case testing

The framework must generate both:

- valid records that meet all business and structural rules, and
- intentionally invalid records with explicit error labels.

Invalid records must be traceable through a stable `ErrorScenarioCode` so that downstream tools can test expected outcomes against known scenarios.

---

## 4. Intended Use Cases

The dataset is intended to serve as a shared internal test and demonstration asset across engineering, product, compliance, and commercial teams.

Primary use cases include:

- testing ingestion pipelines and data models,
- validating ERP readiness and cleansing workflows,
- testing business and tax rule engines,
- demonstrating exception handling and remediation workflows,
- supporting architecture and performance testing, and
- enabling future analytics or AI-assisted features such as data quality scoring, anomaly detection, and VAT classification support.

The scope of this phase is limited to structured tabular datasets and metadata files. Generation of UBL, Peppol BIS Billing 3.0, or PINT-AE-compliant XML is out of scope for this phase and will be handled as a downstream transformation activity.

The dataset is not intended to represent any real taxpayer or business. All records must remain fully synthetic and must not reuse production or customer data.

---

## 5. Design Principles

### 5.1 Separation of concerns

The generation pipeline must conceptually separate three stages:

| Stage | Purpose |
| --- | --- |
| Behavioural generation | Create realistic commercial transactions, including what was sold, when, to whom, and in what quantities. |
| Compliance enforcement | Apply deterministic VAT logic, document totals, identifiers, and validation rules. |
| Structural readiness | Populate all fields required for downstream transformation into UBL / Peppol / PINT-AE-aligned structures. |

This prevents probabilistic generation logic from weakening accounting and compliance correctness.

### 5.2 Compliance correctness takes priority

Where statistical realism and compliance correctness conflict, compliance correctness takes priority for all valid records.

For valid records:

- VAT categories,
- VAT rates,
- totals,
- cross-file references, and
- rounding

must be deterministically correct.

### 5.3 Stable identities

The generator must maintain:

- stable customers,
- stable buyer TRNs per customer where applicable,
- stable item codes and item definitions, and
- stable relationships between customer segments and common purchased items.

### 5.4 Configurability

Business distributions, proportions, and volume assumptions must be controlled by parameters rather than hard-coded logic.

### 5.5 Deterministic reproducibility

Given the same configuration and seed values, the generator must be able to reproduce the same dataset.

This requirement supports:

- regression testing,
- controlled demonstrations, and
- repeatable downstream validation.

---

## 6. Scope of Data Covered

### 6.1 Alignment target

This dataset must be structurally compatible with a future UAE e-invoicing implementation aligned to:

- UBL 2.1,
- Peppol BIS Billing 3.0 concepts, and
- a future UAE PINT-AE profile.

For this document version, those references define structural readiness requirements only. They do not require XML generation in this phase.

### 6.2 In-scope document types

The framework shall generate:

- standard tax invoices (`InvoiceTypeCode = 380`), and
- credit notes (`InvoiceTypeCode = 381`).

Debit notes, self-billing, and B2C simplified tax invoice scenarios are out of scope for the initial implementation.

### 6.3 In-scope transactional entities

The framework shall generate and maintain:

- invoice header records,
- invoice line records,
- invoice-level VAT breakdown records as a delivered dataset entity, and
- document reference relationships between credit notes and original invoices.

Referential integrity must hold across all entities.

For the avoidance of doubt, invoice-level VAT breakdown is not treated as a purely implied or downstream-only calculation in version `1.0`. It must be delivered explicitly so that reconciliation, rule validation, and mapping workflows can test provided tax subtotals directly.

### 6.4 In-scope commercial fields

At minimum, the dataset must contain:

- document identifiers and numbering,
- issue date and due date,
- document type and status,
- seller and buyer identifiers and names,
- currency code,
- payment terms and payment means where applicable,
- line item commercial fields,
- document totals, and
- linkage fields for credit notes.

### 6.5 In-scope VAT and tax fields

At minimum, the dataset must contain:

- VAT category per line,
- VAT rate per line,
- taxable amount per line,
- VAT amount per line,
- invoice-level VAT breakdown totals by tax category, and
- invoice-level tax totals and payable totals.

The dataset must support invoices with more than one VAT category.

### 6.6 In-scope supporting master data

The framework must generate supporting data required for realistic transaction generation, including:

- customer master data,
- item catalogue data, and
- stable mappings between customers and typical purchased items.

### 6.7 In-scope structural readiness fields

The dataset must include fields required to populate downstream e-invoicing structures, including:

- party identifiers,
- endpoint identifiers and identifier schemes,
- document profile and customization identifiers,
- tax scheme identifiers, and
- tax category identifiers.

These values may be synthetic placeholders in this phase but must be structurally valid.

### 6.8 In-scope data quality and exception fields

The framework must support intentional generation and explicit flagging of:

- missing mandatory fields,
- incorrect identifier formats,
- VAT classification inconsistencies,
- header and line reconciliation mismatches, and
- broken references for negative testing.

### 6.9 Out-of-scope data

The following are out of scope for the initial implementation:

- inventory and stock management data,
- purchase orders, contracts, and delivery notes,
- accounting ledgers and journal entries,
- payment execution and settlement data,
- banking or wallet transactions, and
- customs or logistics documents.

### 6.10 Extensibility

The data model and generation logic must support future extension without re-engineering the core framework.

Planned future extension areas include:

- debit notes,
- self-billing,
- B2C or simplified tax invoices,
- industry-specific profiles, and
- future UAE-specific e-invoicing requirements once formally published.

---

## 7. Regulatory Alignment Scope

### 7.1 Baseline alignment

This specification is aligned to:

- simplified UAE VAT treatment for the scenarios explicitly covered in this document,
- UAE e-invoicing data readiness requirements as currently understood for solution design,
- Peppol BIS Billing 3.0 structural concepts, and
- anticipated UAE PINT-AE structural placeholders.

### 7.2 Version baseline

This cleanup draft defines the internal requirements baseline for:

- document version `1.0`, and
- dataset schema version `1.0`.

Any later references to expanded requirements must be treated as future enhancements and must not override this baseline unless the document version is explicitly incremented.

### 7.3 Standards dependency note

Where this document references future UAE PINT-AE requirements, those references are design placeholders. If the external standard changes, this document must be updated by explicit version revision rather than by implicit interpretation.

---

## 8. Explicit Non-Goals

The solution is not required to:

- simulate accounting ledger behaviour,
- simulate inventory movement,
- simulate payment execution or settlement,
- model banking rails or payment service provider transactions, or
- provide legal completeness for every UAE VAT edge case.

The output is a synthetic transactional invoice dataset intended for product and validation use.

---

## 9. Data Protection and Governance Requirements

All data must be fully synthetic.

The generator must ensure:

- no use of real company names,
- no use of real VAT or TRN values,
- no personal data,
- no copied or transformed production data, and
- no reused client data.

Any synthetic identifier that resembles a regulatory identifier must be structurally valid for testing but must not belong to a real entity.

The resulting dataset must be suitable for unrestricted internal and controlled external demonstration use.

---

## 10. Data Packaging and Delivery

### 10.1 Delivery package structure

Each dataset generation run shall be delivered as one self-contained package using the following structure:

```text
<run_id>/
  invoice_headers.csv
  invoice_lines.csv
  invoice_vat_breakdown.csv
  customers.csv
  items.csv
  generation_config.json
  run_manifest.json
  error_scenarios.csv
  README.md
```

Where `<run_id>` uniquely identifies the generation run, for example by timestamp and scenario name.

### 10.2 Mandatory data files

| File | Purpose |
| --- | --- |
| `invoice_headers.csv` | One row per invoice or credit note document. |
| `invoice_lines.csv` | One row per invoice line. |
| `invoice_vat_breakdown.csv` | One row per invoice and tax category subtotal. This file is mandatory so consumers do not need to derive VAT subtotals before performing reconciliation, validation, or mapping tests. |
| `customers.csv` | Customer master data used by the generator. |
| `items.csv` | Item catalogue used by the generator. |
| `error_scenarios.csv` | Reference list of `ErrorScenarioCode` values and their meanings. |

### 10.3 Mandatory metadata files

`generation_config.json` must include:

- all generation parameters,
- all random seed values,
- the selected scenario profile, and
- any feature flags or optional generation settings.

`run_manifest.json` must include:

- dataset identifier,
- document version,
- schema version,
- generation timestamp,
- document counts by type,
- total line count,
- invalid document count and percentage, and
- file-level row counts.

`README.md` must include:

- a short dataset description,
- file descriptions,
- known assumptions, and
- any optional features enabled in the run.

### 10.4 File format requirements

All CSV files must use:

- UTF-8 encoding,
- comma delimiters,
- `.` as the decimal separator, and
- ISO 8601 date or datetime formats.

Optional alternative formats such as Parquet may be provided in addition to CSV, but CSV is mandatory.

### 10.5 Schema stability rules

Column names, data types, and semantic meanings must remain stable across runs for a given schema version.

Any change to:

- column names,
- data types,
- calculation logic that changes field semantics, or
- mandatory file presence

requires a schema version increment.

### 10.6 Record ordering and identifiers

Record order within a file is not semantically significant.

However:

- primary identifiers must be unique within the dataset,
- foreign keys must resolve correctly across files, and
- invoice and credit note identifiers must be unique within their document type sequences.

### 10.7 Negative test case labelling

Every intentionally invalid record must include a stable `ErrorScenarioCode`.

If a document contains both valid and invalid elements, the document-level record and each impacted row must carry the appropriate scenario code where applicable.

### 10.8 Delivery validation checklist

Each delivery must pass these checks before handover:

- all mandatory files are present,
- referential integrity holds across files,
- all valid documents reconcile at line, VAT breakdown, and header level,
- configured invalid percentages are met within tolerance,
- metadata files are complete and readable, and
- schema version and document version are recorded.

---

## 11. Data Generation Parameters

### 11.1 Initial delivery profile

The initial delivery profile is:

- UAE B2B professional services sector,
- with limited export and international service transactions, and
- all documents issued in `AED`.

Foreign currency treatment is out of scope for schema version `1.0`.

### 11.2 Global controls

| Parameter | Initial Value | Notes |
| --- | --- | --- |
| `N_DOCUMENTS` | `5000` | Total documents, including invoices and credit notes. |
| `START_DATE` | `2025-01-01` | Inclusive start date. |
| `END_DATE` | `2025-12-31` | Inclusive end date. |
| `SELLER_TRN` | `100987654321000` | Synthetic fixed 15-digit value for this baseline. Must remain non-real. |
| `CURRENCY` | `AED` | Fixed for version `1.0`. |
| `CREDIT_NOTE_SHARE` | `0.06` | 6% of total documents. |
| `INVALID_SHARE` | `0.04` | 4% of total documents. |
| `DISCOUNT_SHARE` | `0.08` | 8% of documents include a document-level allowance. |
| `CHARGE_SHARE` | `0.03` | 3% of documents include a document-level charge. |
| `TOP_CUSTOMER_SHARE` | `0.60` | Top 20% of customers generate 60% of documents. |
| `N_CUSTOMERS` | `250` | Initial customer master size. |
| `AE_BUYER_SHARE` | `0.85` | 85% UAE buyers, 15% non-UAE buyers. |

### 11.3 Day-of-week weighting

Use the following issue-date weighting:

| Day | Weight |
| --- | --- |
| Mon | `1.00` |
| Tue | `1.00` |
| Wed | `1.00` |
| Thu | `1.00` |
| Fri | `0.70` |
| Sat | `0.30` |
| Sun | `0.30` |

### 11.4 Document type mix

| InvoiceTypeCode | Description | Share |
| --- | --- | --- |
| `380` | Invoice | `0.94` |
| `381` | Credit Note | `0.06` |

### 11.5 Line count distribution

| Lines Per Document | Probability |
| --- | --- |
| `1` | `0.30` |
| `2` | `0.25` |
| `3` | `0.18` |
| `4` | `0.10` |
| `5` | `0.07` |
| `6` | `0.05` |
| `7` | `0.02` |
| `8` | `0.02` |
| `9` | `0.005` |
| `10` | `0.005` |

### 11.6 Quantity distribution

| Band | Min | Max | Probability |
| --- | --- | --- | --- |
| `Q1` | `1` | `1` | `0.40` |
| `Q2` | `2` | `3` | `0.20` |
| `Q3` | `4` | `10` | `0.20` |
| `Q4` | `11` | `50` | `0.15` |
| `Q5` | `51` | `100` | `0.05` |

### 11.7 Price bands

| Band | Min AED | Max AED | Probability |
| --- | --- | --- | --- |
| `P1` | `10` | `100` | `0.25` |
| `P2` | `101` | `500` | `0.35` |
| `P3` | `501` | `2000` | `0.25` |
| `P4` | `2001` | `5000` | `0.15` |

Each item in the item catalogue must map to a default price band. Purely random price selection without item-level defaults is not acceptable.

### 11.8 VAT classification logic

The generator must apply VAT classification rules in this order:

| Priority | Condition | Tax Category | Tax Rate |
| --- | --- | --- | --- |
| `1` | `ItemVATClass = EXEMPT` | `E` | `0` |
| `2` | `BuyerCountry != AE` and `ItemVATClass in {EXPORT_GOODS, INTL_SERVICE}` | `Z` | `0` |
| `3` | All other in-scope cases | `S` | `5` |

If an optional fallback is required for incomplete source parameterisation, the default category weight guidance is:

- `S = 0.88`
- `Z = 0.09`
- `E = 0.03`

However, deterministic rule evaluation is mandatory for valid records.

### 11.9 Customer master generation

The initial customer master must contain `250` stable customer rows.

Minimum generation rules:

- `CustomerID`: sequential format `CUST000001` to `CUST000250`
- `BuyerTRN`: 15-digit synthetic value for UAE customers; nullable for non-UAE customers
- `BuyerName`: synthetic name
- `BuyerCountry`: `AE` for 85% of customers; otherwise selected from an approved synthetic list
- `Industry`: selected from a defined sector list
- top 20% of customers are designated as tier-A customers and generate 60% of documents

### 11.10 Item catalogue generation

The initial item catalogue must contain between `40` and `80` stable items.

Each item must define:

- `ItemCode`
- `ItemName`
- `ItemCategory`
- `ItemVATClass`
- `DefaultPriceBand`

To balance clarity and maintainability:

- the item catalogue rules remain in the main body of this BRD, and
- the baseline starter catalogue for schema version `1.0` is defined in the technical appendix.

This keeps the requirements readable while still providing an explicit reference set for the initial implementation.

The final generator must support extension of the catalogue without code changes.

### 11.11 Allowances and charges

Document-level allowances and charges are supported in the initial scope.

Document-level allowance rules:

- apply to approximately 8% of documents,
- use a percentage discount,
- range from 1% to 10% of the pre-discount taxable base.

Document-level charge rules:

- apply to approximately 3% of documents,
- use a fixed amount,
- range from AED 10 to AED 200.

For valid records, the VAT treatment of allowances and charges must follow a single deterministic rule:

- if the document contains only one tax category, the allowance or charge inherits that tax category,
- if the document contains multiple tax categories, allocate the allowance or charge proportionally across categories based on pre-adjustment taxable amount.

Always forcing a charge to standard-rated is not permitted for valid records.

### 11.12 Payment terms

The initial payment terms distribution is:

| Term Code | Description | Probability | Days |
| --- | --- | --- | --- |
| `IMMED` | Immediate | `0.20` | `0` |
| `NET7` | Net 7 | `0.20` | `7` |
| `NET15` | Net 15 | `0.30` | `15` |
| `NET30` | Net 30 | `0.30` | `30` |

`DueDate` must equal `IssueDate + Days`.

### 11.13 Credit note linkage rules

Credit notes must always reference a previously generated invoice.

For valid credit notes:

- the referenced invoice must belong to the same customer,
- the reference must point to an existing invoice with `InvoiceTypeCode = 380`,
- the credit note issue date must be on or after the original invoice issue date, and
- the credit note value must not exceed the amount being reversed unless the scenario is intentionally invalid.

Typical credit note line count distribution:

| Lines | Probability |
| --- | --- |
| `1` | `0.60` |
| `2` | `0.25` |
| `3` | `0.15` |

For credit notes in valid scenarios:

- quantities remain positive,
- taxable amounts are negative,
- VAT amounts are negative, and
- header totals are negative.

### 11.14 Invalid scenario injection

The initial invalid document target is 4% of all generated documents.

The baseline error scenarios are:

| Error Code | Description | Scope | Expected Failure Type |
| --- | --- | --- | --- |
| `ERR01_MISSING_BUYER_TRN` | Missing buyer TRN for an AE customer | Header | Mandatory field failure |
| `ERR02_BAD_TRN_LENGTH` | Buyer TRN is not 15 digits | Header | Format failure |
| `ERR03_TAX_MISMATCH` | Tax category and tax rate are inconsistent | Line | Tax logic failure |
| `ERR04_TOTALS_NOT_RECONCILE` | Header totals do not match line totals | Header | Arithmetic failure |
| `ERR05_BAD_CURRENCY` | Currency is not `AED` | Header | Structural failure |
| `ERR06_TOO_MANY_DECIMALS` | Monetary values contain more than two decimals | Line | Precision failure |
| `ERR07_NEG_QTY_ON_380` | Negative quantity on an invoice | Line | Logical failure |
| `ERR08_DUPLICATE_INVOICE_ID` | Duplicate invoice identifier | Header | Uniqueness failure |
| `ERR09_CREDIT_NO_REFERENCE` | Credit note without a valid original invoice reference | Header | Referential failure |
| `ERR10_VAT_BREAKDOWN_INCONSISTENT` | VAT breakdown does not reconcile to lines | VAT breakdown / header | Aggregation failure |

The exact count by error code may vary by run, but the selected distribution must be documented in `generation_config.json`.

---

## 12. Technical Appendix

### 12.1 Deterministic calculation order

For valid records, the generator must apply calculations in this order:

1. Determine document type, customer, and document date.
2. Generate lines and assign item, quantity, and unit price.
3. Calculate gross line amount as `Quantity * UnitPrice`.
4. Apply any line-level allowances or charges, if supported.
5. Determine line VAT category and rate using the VAT classification rules.
6. Calculate line taxable amount.
7. Calculate line VAT amount using the applicable rate.
8. Round line taxable amount and line VAT amount to 2 decimals using standard half-up rounding.
9. Aggregate invoice-level taxable amounts and VAT amounts by tax category.
10. Apply any document-level allowance or charge using the deterministic allocation rule.
11. Recalculate affected tax-category subtotals after document-level adjustments.
12. Calculate `TaxExclusiveAmount`, `TaxAmount`, `TaxInclusiveAmount`, and `PayableAmount`.
13. Round all final monetary values to 2 decimals using standard half-up rounding.

### 12.2 Minimum CSV schema

The following columns are mandatory in schema version `1.0`.

#### `invoice_headers.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `InvoiceID` | string | Unique document identifier. |
| `InvoiceTypeCode` | string | `380` or `381`. |
| `InvoiceStatus` | string | `ISSUED`, `CANCELLED`, or `SUPERSEDED`. |
| `IssueDate` | date | ISO 8601 date. |
| `DueDate` | date | ISO 8601 date. |
| `CurrencyCode` | string | `AED` for valid records in version `1.0`. |
| `SellerID` | string | Synthetic seller identifier. |
| `SellerTRN` | string | Synthetic 15-digit seller TRN. |
| `BuyerID` | string | Foreign key to `customers.csv`. |
| `BuyerTRN` | string | Nullable only where allowed. |
| `BuyerCountry` | string | ISO country code. |
| `PaymentTermCode` | string | Optional but recommended. |
| `OriginalInvoiceID` | string | Mandatory for credit notes; null for invoices. |
| `TaxExclusiveAmount` | decimal(18,2) | Header taxable total after document-level adjustments. |
| `TaxAmount` | decimal(18,2) | Header VAT total. |
| `TaxInclusiveAmount` | decimal(18,2) | `TaxExclusiveAmount + TaxAmount`. |
| `PayableAmount` | decimal(18,2) | Payable amount after all adjustments. |
| `ErrorScenarioCode` | string | Null for valid records. |

#### `invoice_lines.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `LineID` | string | Unique line identifier. |
| `InvoiceID` | string | Foreign key to `invoice_headers.csv`. |
| `LineNumber` | integer | Sequential within invoice. |
| `ItemCode` | string | Foreign key to `items.csv`. |
| `ItemDescription` | string | Synthetic item description. |
| `Quantity` | decimal(18,3) | Positive for valid records. |
| `UnitOfMeasure` | string | Synthetic but consistent. |
| `UnitPrice` | decimal(18,2) | Pre-tax unit price. |
| `LineAllowanceAmount` | decimal(18,2) | Zero if unused. |
| `LineChargeAmount` | decimal(18,2) | Zero if unused. |
| `LineExtensionAmount` | decimal(18,2) | Net line amount before VAT. |
| `TaxCategory` | string | `S`, `Z`, or `E`. |
| `TaxRate` | decimal(5,2) | `5.00` or `0.00` in this baseline. |
| `TaxAmount` | decimal(18,2) | Line VAT amount. |
| `ErrorScenarioCode` | string | Null for valid rows. |

#### `invoice_vat_breakdown.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `InvoiceID` | string | Foreign key to `invoice_headers.csv`. |
| `TaxCategory` | string | VAT category subtotal key. |
| `TaxRate` | decimal(5,2) | Rate for the subtotal. |
| `TaxableAmount` | decimal(18,2) | Sum of taxable amounts in this category. |
| `TaxAmount` | decimal(18,2) | Sum of VAT amounts in this category. |
| `ErrorScenarioCode` | string | Null for valid rows. |

#### `customers.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `CustomerID` | string | Primary key. |
| `BuyerName` | string | Synthetic customer name. |
| `BuyerCountry` | string | ISO country code. |
| `BuyerTRN` | string | Synthetic 15-digit value or null where allowed. |
| `Industry` | string | Sector classification. |
| `CustomerTier` | string | For example `A` or `B`. |

#### `items.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `ItemCode` | string | Primary key. |
| `ItemName` | string | Synthetic item name. |
| `ItemCategory` | string | Goods, services, or another controlled category. |
| `ItemVATClass` | string | `STANDARD`, `EXEMPT`, `EXPORT_GOODS`, or `INTL_SERVICE`. |
| `DefaultPriceBand` | string | Price band key. |

#### `error_scenarios.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `ErrorScenarioCode` | string | Primary key. |
| `ErrorType` | string | Short label. |
| `Category` | string | Structural, arithmetic, referential, and so on. |
| `Description` | string | Human-readable definition. |
| `ExpectedValidationFailure` | string | Expected downstream outcome. |

### 12.3 Identifier rules

Document identifiers must use:

- invoices: `INV-YYYY-000001`
- credit notes: `CN-YYYY-000001`

Identifiers must be unique and strictly increasing within each document type sequence.

### 12.4 Rounding rules

All valid monetary values must:

- be rounded to 2 decimal places,
- use standard half-up rounding, and
- not contain more than two decimals after final calculation.

Higher precision is permitted only in intentionally invalid scenarios.

### 12.5 Baseline starter item catalogue

The following starter item catalogue defines the baseline reference set for the initial implementation. It is included to make the version `1.0` starting point explicit. The generator may extend this list, but these rows should remain valid unless the BRD version is revised.

| ItemCode | ItemName | ItemCategory | ItemVATClass | DefaultPriceBand |
| --- | --- | --- | --- | --- |
| `ITM001` | Professional Services | Services | `STANDARD` | `P3` |
| `ITM002` | Consulting Hours | Services | `STANDARD` | `P3` |
| `ITM003` | IT Support | Services | `STANDARD` | `P2` |
| `ITM004` | Software Subscription | Services | `STANDARD` | `P2` |
| `ITM005` | Cloud Services | Services | `STANDARD` | `P3` |
| `ITM006` | Training Session | Services | `STANDARD` | `P2` |
| `ITM007` | Maintenance Fee | Services | `STANDARD` | `P2` |
| `ITM008` | Hardware Accessories | Goods | `STANDARD` | `P2` |
| `ITM009` | Hardware Equipment | Goods | `STANDARD` | `P4` |
| `ITM010` | Shipping and Handling | Service | `STANDARD` | `P1` |
| `ITM011` | Export Documentation | Service | `INTL_SERVICE` | `P2` |
| `ITM012` | International Freight | Service | `INTL_SERVICE` | `P4` |
| `ITM013` | Export Goods | Goods | `EXPORT_GOODS` | `P4` |
| `ITM014` | Warranty Extension | Service | `STANDARD` | `P2` |
| `ITM015` | Installation Service | Service | `STANDARD` | `P3` |
| `ITM016` | Spare Parts | Goods | `STANDARD` | `P2` |
| `ITM017` | Licensing Fee | Service | `STANDARD` | `P3` |
| `ITM018` | Data Processing | Service | `STANDARD` | `P2` |
| `ITM019` | API Integration | Service | `STANDARD` | `P3` |
| `ITM020` | Hosting Fee | Service | `STANDARD` | `P2` |
| `ITM021` | Insurance Fee | Service | `EXEMPT` | `P2` |
| `ITM022` | Finance Charge | Service | `EXEMPT` | `P2` |
| `ITM023` | Medical Service | Service | `EXEMPT` | `P3` |
| `ITM024` | Education Service | Service | `EXEMPT` | `P2` |
| `ITM025` | Promotional Discount | N/A | `STANDARD` | `P1` |
| `ITM026` | Delivery Charge | N/A | `STANDARD` | `P1` |
| `ITM027` | Packaging Fee | N/A | `STANDARD` | `P1` |
| `ITM028` | Customs Handling | Service | `INTL_SERVICE` | `P3` |
| `ITM029` | Overseas Support | Service | `INTL_SERVICE` | `P3` |
| `ITM030` | Digital Service Export | Service | `INTL_SERVICE` | `P3` |

Items `ITM025` to `ITM027` are intended primarily for allowance and charge related scenarios and may be used as supporting commercial components where appropriate.
