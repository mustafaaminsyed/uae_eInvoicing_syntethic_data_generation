from __future__ import annotations

import argparse
import csv
import json
import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


TWOPLACES = Decimal("0.01")
THREEPLACES = Decimal("0.001")


def q2(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def fmt2(value: Decimal) -> str:
    return format(q2(value), ".2f")


def fmt3(value: Decimal) -> str:
    return format(value.quantize(THREEPLACES, rounding=ROUND_HALF_UP), ".3f")


@dataclass(frozen=True)
class Config:
    n_documents: int = 1000
    invalid_share: float = 0.15
    credit_note_share: float = 0.06
    ae_buyer_share: float = 0.85
    seed: int = 20260306
    start_date: str = "2026-01-01"
    end_date: str = "2026-12-31"
    currency: str = "AED"
    seller_name: str = "Synthetic Gulf Tech LLC"
    seller_trn: str = "100987654321000"
    seller_tin: str = "1009876543"
    scenario_profile: str = "UAE local B2B with controlled negatives"
    schema_reference: str = "UAE MoF Mandatory Fields V1.0 (2026-02-23)"


ITEMS = [
    ("Consulting Hours", "ERP tax configuration support", "STANDARD", Decimal("200.00"), "HUR"),
    ("Hardware Accessory Kit", "Network accessories bundle", "STANDARD", Decimal("500.00"), "EA"),
    ("Software Subscription", "Annual SaaS subscription", "STANDARD", Decimal("350.00"), "EA"),
    ("Export Documentation", "Cross-border service documentation", "INTL_SERVICE", Decimal("300.00"), "EA"),
    ("Insurance Service", "Business insurance fee", "EXEMPT", Decimal("450.00"), "EA"),
]
PAYMENT_CODES = ["30", "31", "42"]
UAE_SUBDIVISIONS = ["DU", "AZ", "SH", "AJ"]
NON_AE_COUNTRIES = [("SA", "RI"), ("OM", "MU"), ("BH", "BH"), ("IN", "DL"), ("UK", "LN")]
ERROR_CODES = [
    "NEG01_FIELD_11_BAD_TIN",
    "NEG02_FIELD_12_BAD_SCHEME",
    "NEG03_FIELD_15_BAD_TRN",
    "NEG04_FIELD_29_MISSING_BUYER_COUNTRY",
    "NEG05_LINE_TAX_MISMATCH",
    "NEG06_TOTAL_MISMATCH",
    "NEG07_NEGATIVE_QTY_ON_380",
]


class MofSchemaGenerator:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.rng = random.Random(cfg.seed)
        self.invoice_seq = 0
        self.credit_seq = 0
        self.start_date = date.fromisoformat(cfg.start_date)
        self.end_date = date.fromisoformat(cfg.end_date)
        self.rows: list[dict[str, str]] = []
        self.doc_summary: dict[str, dict] = {}

    def _next_invoice_number(self, invoice_type: str, issue_date: date) -> str:
        if invoice_type == "381":
            self.credit_seq += 1
            return f"CN-{issue_date.year}-{self.credit_seq:06d}"
        self.invoice_seq += 1
        return f"INV-{issue_date.year}-{self.invoice_seq:06d}"

    def _issue_date(self) -> date:
        delta = (self.end_date - self.start_date).days
        return self.start_date + timedelta(days=self.rng.randint(0, max(0, delta)))

    def _buyer_profile(self) -> dict[str, str]:
        is_ae = self.rng.random() < self.cfg.ae_buyer_share
        if is_ae:
            idx = self.rng.randint(1000, 9999)
            return {
                "buyer_name": f"Synthetic UAE Buyer {idx}",
                "buyer_electronic_address": f"{self.rng.randint(1000000000, 9999999999)}",
                "buyer_electronic_identifier": "0235",
                "buyer_legal_registration_identifier": f"LIC-{self.rng.randint(1000000, 9999999)}",
                "buyer_legal_registration_identifier_type": "TRADE_LICENSE",
                "buyer_address_line_1": f"Office {self.rng.randint(1, 250)}, Business District",
                "buyer_city": "Dubai" if self.rng.random() < 0.5 else "Abu Dhabi",
                "buyer_country_subdivision": self.rng.choice(UAE_SUBDIVISIONS),
                "buyer_country_code": "AE",
            }
        cc, subdiv = self.rng.choice(NON_AE_COUNTRIES)
        idx = self.rng.randint(1000, 9999)
        return {
            "buyer_name": f"Synthetic Intl Buyer {idx}",
            "buyer_electronic_address": f"{self.rng.randint(1000000000, 9999999999)}",
            "buyer_electronic_identifier": "0235",
            "buyer_legal_registration_identifier": f"REG-{self.rng.randint(100000, 999999)}",
            "buyer_legal_registration_identifier_type": "BUSINESS_REG",
            "buyer_address_line_1": f"{self.rng.randint(10, 999)} Commerce Street",
            "buyer_city": "Riyadh" if cc == "SA" else "Muscat",
            "buyer_country_subdivision": subdiv,
            "buyer_country_code": cc,
        }

    def _line_tax(self, item_class: str, buyer_country_code: str) -> tuple[str, Decimal]:
        if item_class == "EXEMPT":
            return "E", Decimal("0.00")
        if buyer_country_code != "AE" and item_class == "INTL_SERVICE":
            return "Z", Decimal("0.00")
        return "S", Decimal("5.00")

    def _build_document(self, invoice_type_code: str) -> tuple[list[dict[str, str]], dict]:
        issue_date = self._issue_date()
        due_date = issue_date + timedelta(days=self.rng.choice([7, 15, 30]))
        invoice_number = self._next_invoice_number(invoice_type_code, issue_date)
        buyer = self._buyer_profile()
        payment_code = self.rng.choice(PAYMENT_CODES)
        line_count = self.rng.choices([1, 2, 3, 4], weights=[0.35, 0.35, 0.2, 0.1], k=1)[0]

        lines_raw = []
        for line_no in range(1, line_count + 1):
            item_name, item_desc, item_class, unit_price, uom = self.rng.choice(ITEMS)
            qty = Decimal(self.rng.randint(1, 12))
            tax_cat, tax_rate = self._line_tax(item_class, buyer["buyer_country_code"])
            line_net = q2(qty * unit_price)
            if invoice_type_code == "381":
                line_net = -line_net
            line_vat = q2(line_net * tax_rate / Decimal("100"))
            line_gross = q2(line_net + line_vat)
            lines_raw.append(
                {
                    "invoice_line_identifier": str(line_no),
                    "invoiced_quantity": qty,
                    "unit_of_measure_code": uom,
                    "invoice_line_net_amount": line_net,
                    "item_net_price": unit_price,
                    "item_gross_price": q2(unit_price + (unit_price * tax_rate / Decimal("100"))),
                    "item_price_base_quantity": Decimal("1.000"),
                    "invoiced_item_tax_category_code": tax_cat,
                    "invoiced_item_tax_rate": tax_rate,
                    "vat_line_amount_in_aed": line_vat,
                    "invoice_line_amount_in_aed": line_gross,
                    "item_name": item_name,
                    "item_description": item_desc,
                }
            )

        tax_by_cat: dict[tuple[str, str], dict[str, Decimal]] = defaultdict(lambda: {"taxable": Decimal("0.00"), "tax": Decimal("0.00")})
        for ln in lines_raw:
            key = (ln["invoiced_item_tax_category_code"], fmt2(ln["invoiced_item_tax_rate"]))
            tax_by_cat[key]["taxable"] += ln["invoice_line_net_amount"]
            tax_by_cat[key]["tax"] += ln["vat_line_amount_in_aed"]

        sum_line_net = q2(sum((ln["invoice_line_net_amount"] for ln in lines_raw), Decimal("0.00")))
        total_wo_tax = sum_line_net
        total_tax = q2(sum((ln["vat_line_amount_in_aed"] for ln in lines_raw), Decimal("0.00")))
        total_with_tax = q2(total_wo_tax + total_tax)
        amount_due = total_with_tax

        rows: list[dict[str, str]] = []
        for ln in lines_raw:
            key = (ln["invoiced_item_tax_category_code"], fmt2(ln["invoiced_item_tax_rate"]))
            row = {
                "scenario_id": "",
                "test_expectation": "expected_pass",
                "error_scenario_code": "",
                "invoice_number": invoice_number,
                "invoice_date": issue_date.isoformat(),
                "invoice_type_code": invoice_type_code,
                "invoice_currency_code": self.cfg.currency,
                "invoice_transaction_type_code": "388",
                "payment_due_date": due_date.isoformat(),
                "business_process_type": "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
                "specification_identifier": "urn:cen.eu:en16931:2017",
                "payment_means_type_code": payment_code,
                "seller_name": self.cfg.seller_name,
                "seller_electronic_address": self.cfg.seller_tin,
                "seller_electronic_identifier": "0235",
                "seller_legal_registration_identifier": "LIC-7894561",
                "seller_legal_registration_identifier_type": "TRADE_LICENSE",
                "seller_tax_registration_identifier": self.cfg.seller_trn,
                "seller_tax_scheme_code": "VAT",
                "seller_address_line_1": "Office 1203, Sheikh Zayed Road",
                "seller_city": "Dubai",
                "seller_country_subdivision": "DU",
                "seller_country_code": "AE",
                "buyer_name": buyer["buyer_name"],
                "buyer_electronic_address": buyer["buyer_electronic_address"],
                "buyer_electronic_identifier": buyer["buyer_electronic_identifier"],
                "buyer_legal_registration_identifier": buyer["buyer_legal_registration_identifier"],
                "buyer_legal_registration_identifier_type": buyer["buyer_legal_registration_identifier_type"],
                "buyer_address_line_1": buyer["buyer_address_line_1"],
                "buyer_city": buyer["buyer_city"],
                "buyer_country_subdivision": buyer["buyer_country_subdivision"],
                "buyer_country_code": buyer["buyer_country_code"],
                "sum_of_invoice_line_net_amount": fmt2(sum_line_net),
                "invoice_total_amount_without_tax": fmt2(total_wo_tax),
                "invoice_total_tax_amount": fmt2(total_tax),
                "invoice_total_amount_with_tax": fmt2(total_with_tax),
                "amount_due_for_payment": fmt2(amount_due),
                "tax_category_taxable_amount": fmt2(q2(tax_by_cat[key]["taxable"])),
                "tax_category_tax_amount": fmt2(q2(tax_by_cat[key]["tax"])),
                "tax_category_code": ln["invoiced_item_tax_category_code"],
                "tax_category_rate": fmt2(ln["invoiced_item_tax_rate"]),
                "invoice_line_identifier": ln["invoice_line_identifier"],
                "invoiced_quantity": fmt3(ln["invoiced_quantity"]),
                "unit_of_measure_code": ln["unit_of_measure_code"],
                "invoice_line_net_amount": fmt2(ln["invoice_line_net_amount"]),
                "item_net_price": fmt2(ln["item_net_price"]),
                "item_gross_price": fmt2(ln["item_gross_price"]),
                "item_price_base_quantity": fmt3(ln["item_price_base_quantity"]),
                "invoiced_item_tax_category_code": ln["invoiced_item_tax_category_code"],
                "invoiced_item_tax_rate": fmt2(ln["invoiced_item_tax_rate"]),
                "vat_line_amount_in_aed": fmt2(ln["vat_line_amount_in_aed"]),
                "invoice_line_amount_in_aed": fmt2(ln["invoice_line_amount_in_aed"]),
                "item_name": ln["item_name"],
                "item_description": ln["item_description"],
            }
            rows.append(row)

        summary = {
            "invoice_number": invoice_number,
            "invoice_type_code": invoice_type_code,
            "sum_line_net": total_wo_tax,
            "sum_tax": total_tax,
            "line_count": len(lines_raw),
        }
        return rows, summary

    def _inject_negative(self, rows: list[dict[str, str]], code: str) -> None:
        for row in rows:
            row["test_expectation"] = "expected_fail"
            row["error_scenario_code"] = code

        first = rows[0]
        if code == "NEG01_FIELD_11_BAD_TIN":
            for row in rows:
                row["seller_electronic_address"] = "100987654"
        elif code == "NEG02_FIELD_12_BAD_SCHEME":
            for row in rows:
                row["seller_electronic_identifier"] = "9999"
        elif code == "NEG03_FIELD_15_BAD_TRN":
            for row in rows:
                row["seller_tax_registration_identifier"] = "10098765432100"
        elif code == "NEG04_FIELD_29_MISSING_BUYER_COUNTRY":
            for row in rows:
                row["buyer_country_code"] = ""
        elif code == "NEG05_LINE_TAX_MISMATCH":
            first["invoiced_item_tax_category_code"] = "S"
            first["invoiced_item_tax_rate"] = "0.00"
            first["tax_category_code"] = "S"
            first["tax_category_rate"] = "0.00"
        elif code == "NEG06_TOTAL_MISMATCH":
            for row in rows:
                row["sum_of_invoice_line_net_amount"] = fmt2(Decimal(row["sum_of_invoice_line_net_amount"]) + Decimal("100.00"))
        elif code == "NEG07_NEGATIVE_QTY_ON_380":
            if first["invoice_type_code"] == "380":
                first["invoiced_quantity"] = "-1.000"

    def generate(self) -> None:
        n_invalid_docs = int(round(self.cfg.n_documents * self.cfg.invalid_share))
        n_credit = int(round(self.cfg.n_documents * self.cfg.credit_note_share))
        invalid_doc_numbers: set[int] = set(self.rng.sample(range(self.cfg.n_documents), k=n_invalid_docs))

        for idx in range(self.cfg.n_documents):
            invoice_type = "381" if idx < n_credit else "380"
            rows, summary = self._build_document(invoice_type)
            rows[0]["scenario_id"] = f"SCN-{idx + 1:06d}"
            if idx in invalid_doc_numbers:
                code = self.rng.choice(ERROR_CODES)
                self._inject_negative(rows, code)
            self.rows.extend(rows)
            self.doc_summary[summary["invoice_number"]] = summary

    def write_output(self, output_dir: Path) -> Path:
        run_id = f"mof_run_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_{self.cfg.seed}"
        run_dir = output_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=False)

        field_order = [
            "scenario_id", "test_expectation", "error_scenario_code",
            "invoice_number", "invoice_date", "invoice_type_code", "invoice_currency_code",
            "invoice_transaction_type_code", "payment_due_date", "business_process_type",
            "specification_identifier", "payment_means_type_code",
            "seller_name", "seller_electronic_address", "seller_electronic_identifier",
            "seller_legal_registration_identifier", "seller_legal_registration_identifier_type",
            "seller_tax_registration_identifier", "seller_tax_scheme_code",
            "seller_address_line_1", "seller_city", "seller_country_subdivision", "seller_country_code",
            "buyer_name", "buyer_electronic_address", "buyer_electronic_identifier",
            "buyer_legal_registration_identifier", "buyer_legal_registration_identifier_type",
            "buyer_address_line_1", "buyer_city", "buyer_country_subdivision", "buyer_country_code",
            "sum_of_invoice_line_net_amount", "invoice_total_amount_without_tax", "invoice_total_tax_amount",
            "invoice_total_amount_with_tax", "amount_due_for_payment",
            "tax_category_taxable_amount", "tax_category_tax_amount", "tax_category_code", "tax_category_rate",
            "invoice_line_identifier", "invoiced_quantity", "unit_of_measure_code",
            "invoice_line_net_amount", "item_net_price", "item_gross_price", "item_price_base_quantity",
            "invoiced_item_tax_category_code", "invoiced_item_tax_rate",
            "vat_line_amount_in_aed", "invoice_line_amount_in_aed", "item_name", "item_description",
        ]
        with (run_dir / "mof_schema_dataset.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=field_order)
            writer.writeheader()
            writer.writerows(self.rows)

        valid_docs = len({r["invoice_number"] for r in self.rows if r["test_expectation"] == "expected_pass"})
        invalid_docs = len({r["invoice_number"] for r in self.rows if r["test_expectation"] == "expected_fail"})
        manifest = {
            "dataset_identifier": run_id,
            "generated_at_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "documents_total": self.cfg.n_documents,
            "valid_documents": valid_docs,
            "invalid_documents": invalid_docs,
            "invalid_share": round((invalid_docs / self.cfg.n_documents), 4),
            "rows_total": len(self.rows),
            "schema_reference": self.cfg.schema_reference,
            "scenario_profile": self.cfg.scenario_profile,
        }
        (run_dir / "run_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        (run_dir / "generation_config.json").write_text(json.dumps(self.cfg.__dict__, indent=2), encoding="utf-8")

        readme = "\n".join(
            [
                f"# {run_id}",
                "",
                "MoF-schema-first synthetic dataset.",
                "",
                "Primary file:",
                "- mof_schema_dataset.csv (flat row-per-line dataset with all 51 mandatory field columns)",
                "",
                "Includes both positive and negative scenarios with explicit labels.",
            ]
        )
        (run_dir / "README.md").write_text(readme, encoding="utf-8")
        return run_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate MoF schema aligned synthetic dataset.")
    parser.add_argument("--output-dir", default="output_mof")
    parser.add_argument("--n-documents", type=int, default=1000)
    parser.add_argument("--invalid-share", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=20260306)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = Config(n_documents=args.n_documents, invalid_share=args.invalid_share, seed=args.seed)
    gen = MofSchemaGenerator(cfg)
    gen.generate()
    run_dir = gen.write_output(Path(args.output_dir))
    print(run_dir)


if __name__ == "__main__":
    main()
