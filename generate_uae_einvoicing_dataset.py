from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import random
from typing import Iterable


TWOPLACES = Decimal("0.01")
THREEPLACES = Decimal("0.001")


def q2(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def q3(value: Decimal) -> Decimal:
    return value.quantize(THREEPLACES, rounding=ROUND_HALF_UP)


def fmt_decimal(value: Decimal, places: int = 2) -> str:
    scale = TWOPLACES if places == 2 else THREEPLACES
    return format(value.quantize(scale, rounding=ROUND_HALF_UP), f".{places}f")


def weighted_choice(rng: random.Random, items: list, weights: list[float]):
    return rng.choices(items, weights=weights, k=1)[0]


def allocate_proportionally(total_amount: Decimal, bases: list[Decimal]) -> list[Decimal]:
    if not bases or total_amount == Decimal("0.00"):
        return [Decimal("0.00")] * len(bases)
    total_base = sum(bases, Decimal("0.00"))
    if total_base <= Decimal("0.00"):
        return [Decimal("0.00")] * len(bases)

    allocations: list[Decimal] = []
    running = Decimal("0.00")
    for idx, base in enumerate(bases):
        if idx == len(bases) - 1:
            alloc = q2(total_amount - running)
        else:
            alloc = q2((total_amount * base) / total_base)
            running += alloc
        allocations.append(alloc)
    return allocations


@dataclass(frozen=True)
class Config:
    n_documents: int = 5000
    start_date: str = "2025-01-01"
    end_date: str = "2025-12-31"
    seller_trn: str = "100987654321000"
    currency: str = "AED"
    credit_note_share: float = 0.06
    invalid_share: float = 0.04
    discount_share: float = 0.08
    charge_share: float = 0.03
    top_customer_share: float = 0.60
    n_customers: int = 250
    ae_buyer_share: float = 0.85
    seed: int = 20260303
    scenario_profile: str = "UAE B2B professional services"
    schema_version: str = "1.0"
    document_version: str = "1.0"


STARTER_ITEMS = [
    ("ITM001", "Professional Services", "Services", "STANDARD", "P3"),
    ("ITM002", "Consulting Hours", "Services", "STANDARD", "P3"),
    ("ITM003", "IT Support", "Services", "STANDARD", "P2"),
    ("ITM004", "Software Subscription", "Services", "STANDARD", "P2"),
    ("ITM005", "Cloud Services", "Services", "STANDARD", "P3"),
    ("ITM006", "Training Session", "Services", "STANDARD", "P2"),
    ("ITM007", "Maintenance Fee", "Services", "STANDARD", "P2"),
    ("ITM008", "Hardware Accessories", "Goods", "STANDARD", "P2"),
    ("ITM009", "Hardware Equipment", "Goods", "STANDARD", "P4"),
    ("ITM010", "Shipping and Handling", "Service", "STANDARD", "P1"),
    ("ITM011", "Export Documentation", "Service", "INTL_SERVICE", "P2"),
    ("ITM012", "International Freight", "Service", "INTL_SERVICE", "P4"),
    ("ITM013", "Export Goods", "Goods", "EXPORT_GOODS", "P4"),
    ("ITM014", "Warranty Extension", "Service", "STANDARD", "P2"),
    ("ITM015", "Installation Service", "Service", "STANDARD", "P3"),
    ("ITM016", "Spare Parts", "Goods", "STANDARD", "P2"),
    ("ITM017", "Licensing Fee", "Service", "STANDARD", "P3"),
    ("ITM018", "Data Processing", "Service", "STANDARD", "P2"),
    ("ITM019", "API Integration", "Service", "STANDARD", "P3"),
    ("ITM020", "Hosting Fee", "Service", "STANDARD", "P2"),
    ("ITM021", "Insurance Fee", "Service", "EXEMPT", "P2"),
    ("ITM022", "Finance Charge", "Service", "EXEMPT", "P2"),
    ("ITM023", "Medical Service", "Service", "EXEMPT", "P3"),
    ("ITM024", "Education Service", "Service", "EXEMPT", "P2"),
    ("ITM025", "Promotional Discount", "N/A", "STANDARD", "P1"),
    ("ITM026", "Delivery Charge", "N/A", "STANDARD", "P1"),
    ("ITM027", "Packaging Fee", "N/A", "STANDARD", "P1"),
    ("ITM028", "Customs Handling", "Service", "INTL_SERVICE", "P3"),
    ("ITM029", "Overseas Support", "Service", "INTL_SERVICE", "P3"),
    ("ITM030", "Digital Service Export", "Service", "INTL_SERVICE", "P3"),
]

COUNTRIES = ["SA", "OM", "BH", "UK", "IN", "US"]
INDUSTRIES = ["Retail", "Services", "Logistics", "Manufacturing", "Healthcare"]
DAY_WEIGHTS = {0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 0.7, 5: 0.3, 6: 0.3}
LINE_COUNT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
LINE_COUNT_WEIGHTS = [0.30, 0.25, 0.18, 0.10, 0.07, 0.05, 0.02, 0.02, 0.005, 0.005]
QTY_BANDS = [
    (1, 1, 0.40),
    (2, 3, 0.20),
    (4, 10, 0.20),
    (11, 50, 0.15),
    (51, 100, 0.05),
]
PRICE_BANDS = {
    "P1": (Decimal("10.00"), Decimal("100.00")),
    "P2": (Decimal("101.00"), Decimal("500.00")),
    "P3": (Decimal("501.00"), Decimal("2000.00")),
    "P4": (Decimal("2001.00"), Decimal("5000.00")),
}
PAYMENT_TERMS = [
    ("IMMED", 0, 0.20),
    ("NET7", 7, 0.20),
    ("NET15", 15, 0.30),
    ("NET30", 30, 0.30),
]
ERROR_SCENARIOS = [
    ("ERR01_MISSING_BUYER_TRN", "Missing Buyer TRN", "Structural", "Mandatory field failure"),
    ("ERR02_BAD_TRN_LENGTH", "Invalid TRN Format", "Format", "Format failure"),
    ("ERR03_TAX_MISMATCH", "VAT Category/Rate Mismatch", "Logical", "Tax logic failure"),
    ("ERR04_TOTALS_NOT_RECONCILE", "Header/Line Total Mismatch", "Arithmetic", "Arithmetic failure"),
    ("ERR05_BAD_CURRENCY", "Invalid Currency Code", "Structural", "Currency validation failure"),
    ("ERR06_TOO_MANY_DECIMALS", "Excess Decimal Precision", "Format", "Precision validation failure"),
    ("ERR07_NEG_QTY_ON_380", "Negative Quantity on Invoice", "Logical", "Invalid quantity"),
    ("ERR08_DUPLICATE_INVOICE_ID", "Duplicate Invoice Number", "Referential", "Uniqueness failure"),
    ("ERR09_CREDIT_NO_REFERENCE", "Credit Note Missing Reference", "Referential", "Linkage failure"),
    ("ERR10_VAT_BREAKDOWN_INCONSISTENT", "VAT Breakdown Aggregation Error", "Aggregation", "Aggregation mismatch"),
]


class Generator:
    def __init__(self, config: Config):
        self.config = config
        self.rng = random.Random(config.seed)
        self.invoice_seq = 0
        self.credit_seq = 0
        self.line_seq = 0
        self.customers = self._build_customers()
        self.items = self._build_items()
        self.date_pool = self._build_date_pool()
        self.headers: list[dict] = []
        self.lines: list[dict] = []
        self.vat_breakdown: list[dict] = []
        self.invoice_index: dict[str, dict] = {}
        self.lines_by_invoice: dict[str, list[dict]] = defaultdict(list)
        self.vat_by_invoice: dict[str, list[dict]] = defaultdict(list)

    def _build_date_pool(self) -> tuple[list[date], list[float]]:
        start = date.fromisoformat(self.config.start_date)
        end = date.fromisoformat(self.config.end_date)
        dates: list[date] = []
        weights: list[float] = []
        current = start
        while current <= end:
            dates.append(current)
            weights.append(DAY_WEIGHTS[current.weekday()])
            current += timedelta(days=1)
        return dates, weights

    def _build_customers(self) -> list[dict]:
        ae_count = round(self.config.n_customers * self.config.ae_buyer_share)
        customers: list[dict] = []
        for idx in range(1, self.config.n_customers + 1):
            customer_id = f"CUST{idx:06d}"
            is_ae = idx <= ae_count
            buyer_country = "AE" if is_ae else COUNTRIES[(idx - ae_count - 1) % len(COUNTRIES)]
            buyer_trn = self._make_trn(200_000_000_000_000 + idx) if is_ae else ""
            customers.append(
                {
                    "CustomerID": customer_id,
                    "BuyerName": f"Synthetic Customer {idx}",
                    "BuyerCountry": buyer_country,
                    "BuyerTRN": buyer_trn,
                    "Industry": INDUSTRIES[(idx - 1) % len(INDUSTRIES)],
                    "CustomerTier": "A" if idx <= max(1, int(self.config.n_customers * 0.2)) else "B",
                }
            )
        return customers

    def _build_items(self) -> list[dict]:
        items = [
            {
                "ItemCode": code,
                "ItemName": name,
                "ItemCategory": category,
                "ItemVATClass": vat_class,
                "DefaultPriceBand": band,
            }
            for code, name, category, vat_class, band in STARTER_ITEMS
        ]
        next_idx = len(items) + 1
        while len(items) < 40:
            code = f"ITM{next_idx:03d}"
            band = ["P1", "P2", "P3", "P4"][(next_idx - 1) % 4]
            vat_class = "STANDARD" if next_idx % 7 else "EXEMPT"
            category = "Services" if next_idx % 2 else "Goods"
            items.append(
                {
                    "ItemCode": code,
                    "ItemName": f"Synthetic Item {next_idx}",
                    "ItemCategory": category,
                    "ItemVATClass": vat_class,
                    "DefaultPriceBand": band,
                }
            )
            next_idx += 1
        return items

    @staticmethod
    def _make_trn(seed_value: int) -> str:
        return f"{seed_value:015d}"[-15:]

    def _choose_customer(self) -> dict:
        top_cutoff = max(1, int(self.config.n_customers * 0.2))
        if self.rng.random() < self.config.top_customer_share:
            return self.customers[self.rng.randrange(0, top_cutoff)]
        return self.customers[self.rng.randrange(top_cutoff, len(self.customers))]

    def _choose_item(self, buyer_country: str) -> dict:
        weights = []
        for item in self.items:
            if buyer_country != "AE" and item["ItemVATClass"] in {"EXPORT_GOODS", "INTL_SERVICE"}:
                weights.append(4.0)
            elif buyer_country == "AE" and item["ItemVATClass"] in {"EXPORT_GOODS", "INTL_SERVICE"}:
                weights.append(0.8)
            else:
                weights.append(2.5 if item["ItemVATClass"] == "STANDARD" else 1.0)
        return self.rng.choices(self.items, weights=weights, k=1)[0]

    def _choose_quantity(self) -> Decimal:
        band = weighted_choice(self.rng, QTY_BANDS, [band[2] for band in QTY_BANDS])
        value = self.rng.randint(band[0], band[1])
        return q3(Decimal(value))

    def _choose_unit_price(self, item: dict) -> Decimal:
        low, high = PRICE_BANDS[item["DefaultPriceBand"]]
        cents_low = int(low * 100)
        cents_high = int(high * 100)
        return q2(Decimal(self.rng.randint(cents_low, cents_high)) / Decimal("100"))

    def _classify_tax(self, item_vat_class: str, buyer_country: str) -> tuple[str, Decimal]:
        if item_vat_class == "EXEMPT":
            return "E", Decimal("0.00")
        if buyer_country != "AE" and item_vat_class in {"EXPORT_GOODS", "INTL_SERVICE"}:
            return "Z", Decimal("0.00")
        return "S", Decimal("5.00")

    def _choose_issue_date(self) -> date:
        return self.rng.choices(self.date_pool[0], weights=self.date_pool[1], k=1)[0]

    def _choose_payment_term(self) -> tuple[str, int]:
        code, days, _ = weighted_choice(self.rng, PAYMENT_TERMS, [term[2] for term in PAYMENT_TERMS])
        return code, days

    def _next_invoice_id(self, is_credit: bool, issue_date: date) -> str:
        if is_credit:
            self.credit_seq += 1
            return f"CN-{issue_date.year}-{self.credit_seq:06d}"
        self.invoice_seq += 1
        return f"INV-{issue_date.year}-{self.invoice_seq:06d}"

    def _new_line_id(self) -> str:
        self.line_seq += 1
        return f"LINE-{self.line_seq:08d}"

    def _generate_invoice(self) -> tuple[dict, list[dict], list[dict]]:
        customer = self._choose_customer()
        issue_date = self._choose_issue_date()
        payment_code, payment_days = self._choose_payment_term()
        due_date = issue_date + timedelta(days=payment_days)
        invoice_id = self._next_invoice_id(False, issue_date)
        line_count = weighted_choice(self.rng, LINE_COUNT_VALUES, LINE_COUNT_WEIGHTS)

        raw_lines = []
        bases: list[Decimal] = []
        for line_no in range(1, line_count + 1):
            item = self._choose_item(customer["BuyerCountry"])
            qty = self._choose_quantity()
            unit_price = self._choose_unit_price(item)
            gross = q2(qty * unit_price)
            tax_category, tax_rate = self._classify_tax(item["ItemVATClass"], customer["BuyerCountry"])
            bases.append(gross)
            raw_lines.append(
                {
                    "LineID": self._new_line_id(),
                    "InvoiceID": invoice_id,
                    "LineNumber": line_no,
                    "ItemCode": item["ItemCode"],
                    "ItemDescription": item["ItemName"],
                    "Quantity": qty,
                    "UnitOfMeasure": "H87" if item["ItemCategory"] in {"Goods", "N/A"} else "EA",
                    "UnitPrice": unit_price,
                    "GrossAmount": gross,
                    "TaxCategory": tax_category,
                    "TaxRate": tax_rate,
                }
            )

        discount_total = Decimal("0.00")
        if self.rng.random() < self.config.discount_share:
            pct = Decimal(str(self.rng.randint(1, 10))) / Decimal("100")
            discount_total = q2(sum(bases, Decimal("0.00")) * pct)

        charge_total = Decimal("0.00")
        if self.rng.random() < self.config.charge_share:
            charge_total = q2(Decimal(self.rng.randint(1000, 20000)) / Decimal("100"))

        discount_allocs = allocate_proportionally(discount_total, bases)
        charge_allocs = allocate_proportionally(charge_total, bases)

        line_rows: list[dict] = []
        tax_groups: dict[tuple[str, str], dict[str, Decimal]] = defaultdict(
            lambda: {"TaxableAmount": Decimal("0.00"), "TaxAmount": Decimal("0.00")}
        )

        for raw, line_discount, line_charge in zip(raw_lines, discount_allocs, charge_allocs):
            line_extension = q2(raw["GrossAmount"] - line_discount + line_charge)
            tax_amount = q2(line_extension * raw["TaxRate"] / Decimal("100"))
            tax_groups[(raw["TaxCategory"], fmt_decimal(raw["TaxRate"]))]["TaxableAmount"] += line_extension
            tax_groups[(raw["TaxCategory"], fmt_decimal(raw["TaxRate"]))]["TaxAmount"] += tax_amount
            line_rows.append(
                {
                    "LineID": raw["LineID"],
                    "InvoiceID": invoice_id,
                    "LineNumber": raw["LineNumber"],
                    "ItemCode": raw["ItemCode"],
                    "ItemDescription": raw["ItemDescription"],
                    "Quantity": fmt_decimal(raw["Quantity"], 3),
                    "UnitOfMeasure": raw["UnitOfMeasure"],
                    "UnitPrice": fmt_decimal(raw["UnitPrice"]),
                    "LineAllowanceAmount": fmt_decimal(line_discount),
                    "LineChargeAmount": fmt_decimal(line_charge),
                    "LineExtensionAmount": fmt_decimal(line_extension),
                    "TaxCategory": raw["TaxCategory"],
                    "TaxRate": fmt_decimal(raw["TaxRate"]),
                    "TaxAmount": fmt_decimal(tax_amount),
                    "ErrorScenarioCode": "",
                }
            )

        vat_rows: list[dict] = []
        tax_exclusive = Decimal("0.00")
        tax_total = Decimal("0.00")
        for (tax_category, tax_rate), totals in sorted(tax_groups.items()):
            taxable = q2(totals["TaxableAmount"])
            tax_amt = q2(totals["TaxAmount"])
            tax_exclusive += taxable
            tax_total += tax_amt
            vat_rows.append(
                {
                    "InvoiceID": invoice_id,
                    "TaxCategory": tax_category,
                    "TaxRate": tax_rate,
                    "TaxableAmount": fmt_decimal(taxable),
                    "TaxAmount": fmt_decimal(tax_amt),
                    "ErrorScenarioCode": "",
                }
            )

        tax_inclusive = q2(tax_exclusive + tax_total)
        header = {
            "InvoiceID": invoice_id,
            "InvoiceTypeCode": "380",
            "InvoiceStatus": "ISSUED",
            "IssueDate": issue_date.isoformat(),
            "DueDate": due_date.isoformat(),
            "CurrencyCode": self.config.currency,
            "SellerID": "SELLER-001",
            "SellerTRN": self.config.seller_trn,
            "BuyerID": customer["CustomerID"],
            "BuyerTRN": customer["BuyerTRN"],
            "BuyerCountry": customer["BuyerCountry"],
            "PaymentTermCode": payment_code,
            "OriginalInvoiceID": "",
            "TaxExclusiveAmount": fmt_decimal(tax_exclusive),
            "TaxAmount": fmt_decimal(tax_total),
            "TaxInclusiveAmount": fmt_decimal(tax_inclusive),
            "PayableAmount": fmt_decimal(tax_inclusive),
            "ErrorScenarioCode": "",
        }
        return header, line_rows, vat_rows

    def _generate_credit_note(self, original_header: dict) -> tuple[dict, list[dict], list[dict]]:
        original_lines = self.lines_by_invoice[original_header["InvoiceID"]]
        customer = next(customer for customer in self.customers if customer["CustomerID"] == original_header["BuyerID"])
        original_date = date.fromisoformat(original_header["IssueDate"])
        latest_date = date.fromisoformat(self.config.end_date)
        issue_date = original_date + timedelta(days=self.rng.randint(0, max(0, (latest_date - original_date).days)))
        payment_code, payment_days = self._choose_payment_term()
        due_date = issue_date + timedelta(days=payment_days)
        invoice_id = self._next_invoice_id(True, issue_date)

        max_lines = min(3, len(original_lines))
        line_count = weighted_choice(self.rng, [1, 2, 3][:max_lines], [0.60, 0.25, 0.15][:max_lines])
        selected_lines = self.rng.sample(original_lines, k=line_count)

        line_rows: list[dict] = []
        tax_groups: dict[tuple[str, str], dict[str, Decimal]] = defaultdict(
            lambda: {"TaxableAmount": Decimal("0.00"), "TaxAmount": Decimal("0.00")}
        )

        for line_no, source in enumerate(selected_lines, start=1):
            original_qty = Decimal(source["Quantity"])
            reduced_qty = q3(max(Decimal("1.000"), q3(original_qty * Decimal(str(self.rng.uniform(0.3, 1.0))))))
            if reduced_qty > original_qty:
                reduced_qty = original_qty
            unit_price = Decimal(source["UnitPrice"])
            line_extension = q2(-(reduced_qty * unit_price))
            tax_rate = Decimal(source["TaxRate"])
            tax_amount = q2(line_extension * tax_rate / Decimal("100"))
            tax_groups[(source["TaxCategory"], source["TaxRate"])]["TaxableAmount"] += line_extension
            tax_groups[(source["TaxCategory"], source["TaxRate"])]["TaxAmount"] += tax_amount
            line_rows.append(
                {
                    "LineID": self._new_line_id(),
                    "InvoiceID": invoice_id,
                    "LineNumber": line_no,
                    "ItemCode": source["ItemCode"],
                    "ItemDescription": source["ItemDescription"],
                    "Quantity": fmt_decimal(reduced_qty, 3),
                    "UnitOfMeasure": source["UnitOfMeasure"],
                    "UnitPrice": source["UnitPrice"],
                    "LineAllowanceAmount": "0.00",
                    "LineChargeAmount": "0.00",
                    "LineExtensionAmount": fmt_decimal(line_extension),
                    "TaxCategory": source["TaxCategory"],
                    "TaxRate": source["TaxRate"],
                    "TaxAmount": fmt_decimal(tax_amount),
                    "ErrorScenarioCode": "",
                }
            )

        vat_rows: list[dict] = []
        tax_exclusive = Decimal("0.00")
        tax_total = Decimal("0.00")
        for (tax_category, tax_rate), totals in sorted(tax_groups.items()):
            taxable = q2(totals["TaxableAmount"])
            tax_amt = q2(totals["TaxAmount"])
            tax_exclusive += taxable
            tax_total += tax_amt
            vat_rows.append(
                {
                    "InvoiceID": invoice_id,
                    "TaxCategory": tax_category,
                    "TaxRate": tax_rate,
                    "TaxableAmount": fmt_decimal(taxable),
                    "TaxAmount": fmt_decimal(tax_amt),
                    "ErrorScenarioCode": "",
                }
            )

        tax_inclusive = q2(tax_exclusive + tax_total)
        header = {
            "InvoiceID": invoice_id,
            "InvoiceTypeCode": "381",
            "InvoiceStatus": "ISSUED",
            "IssueDate": issue_date.isoformat(),
            "DueDate": due_date.isoformat(),
            "CurrencyCode": self.config.currency,
            "SellerID": "SELLER-001",
            "SellerTRN": self.config.seller_trn,
            "BuyerID": customer["CustomerID"],
            "BuyerTRN": customer["BuyerTRN"],
            "BuyerCountry": customer["BuyerCountry"],
            "PaymentTermCode": payment_code,
            "OriginalInvoiceID": original_header["InvoiceID"],
            "TaxExclusiveAmount": fmt_decimal(tax_exclusive),
            "TaxAmount": fmt_decimal(tax_total),
            "TaxInclusiveAmount": fmt_decimal(tax_inclusive),
            "PayableAmount": fmt_decimal(tax_inclusive),
            "ErrorScenarioCode": "",
        }
        return header, line_rows, vat_rows

    def _register_document(self, header: dict, line_rows: list[dict], vat_rows: list[dict]) -> None:
        self.headers.append(header)
        self.invoice_index[header["InvoiceID"]] = header
        self.lines.extend(line_rows)
        self.vat_breakdown.extend(vat_rows)
        self.lines_by_invoice[header["InvoiceID"]] = line_rows
        self.vat_by_invoice[header["InvoiceID"]] = vat_rows

    def generate(self) -> None:
        n_credit = int(round(self.config.n_documents * self.config.credit_note_share))
        n_invoices = self.config.n_documents - n_credit

        for _ in range(n_invoices):
            header, line_rows, vat_rows = self._generate_invoice()
            self._register_document(header, line_rows, vat_rows)

        source_invoices = [header for header in self.headers if header["InvoiceTypeCode"] == "380"]
        for _ in range(n_credit):
            original = self.rng.choice(source_invoices)
            header, line_rows, vat_rows = self._generate_credit_note(original)
            self._register_document(header, line_rows, vat_rows)

        self._inject_invalids()

    def _apply_error_to_invoice(self, header: dict, code: str) -> None:
        line_rows = self.lines_by_invoice[header["InvoiceID"]]
        vat_rows = self.vat_by_invoice[header["InvoiceID"]]
        header["ErrorScenarioCode"] = code

        if code == "ERR01_MISSING_BUYER_TRN":
            header["BuyerTRN"] = ""
        elif code == "ERR02_BAD_TRN_LENGTH":
            header["BuyerTRN"] = "12345678901234"
        elif code == "ERR03_TAX_MISMATCH" and line_rows:
            line_rows[0]["TaxRate"] = "0.00" if line_rows[0]["TaxCategory"] == "S" else "5.00"
            line_rows[0]["ErrorScenarioCode"] = code
        elif code == "ERR04_TOTALS_NOT_RECONCILE":
            header["PayableAmount"] = fmt_decimal(Decimal(header["PayableAmount"]) + Decimal("1.00"))
        elif code == "ERR05_BAD_CURRENCY":
            header["CurrencyCode"] = "USD"
        elif code == "ERR06_TOO_MANY_DECIMALS" and line_rows:
            line_rows[0]["LineExtensionAmount"] = f"{line_rows[0]['LineExtensionAmount']}7"
            line_rows[0]["ErrorScenarioCode"] = code
        elif code == "ERR07_NEG_QTY_ON_380" and line_rows:
            line_rows[0]["Quantity"] = "-1.000"
            line_rows[0]["ErrorScenarioCode"] = code
        elif code == "ERR08_DUPLICATE_INVOICE_ID":
            donor = next(
                (
                    other
                    for other in self.headers
                    if other["InvoiceID"] != header["InvoiceID"] and other["ErrorScenarioCode"]
                ),
                None,
            )
            if donor is None:
                donor = next(other for other in self.headers if other["InvoiceID"] != header["InvoiceID"])
            old_id = header["InvoiceID"]
            new_id = donor["InvoiceID"]
            header["InvoiceID"] = new_id
            for row in line_rows:
                row["InvoiceID"] = new_id
                row["ErrorScenarioCode"] = code
            for row in vat_rows:
                row["InvoiceID"] = new_id
                row["ErrorScenarioCode"] = code
            if old_id in self.lines_by_invoice:
                del self.lines_by_invoice[old_id]
                del self.vat_by_invoice[old_id]
            self.lines_by_invoice[new_id].extend(line_rows)
            self.vat_by_invoice[new_id].extend(vat_rows)
        elif code == "ERR09_CREDIT_NO_REFERENCE":
            header["OriginalInvoiceID"] = ""
        elif code == "ERR10_VAT_BREAKDOWN_INCONSISTENT" and vat_rows:
            vat_rows[0]["TaxAmount"] = fmt_decimal(Decimal(vat_rows[0]["TaxAmount"]) + Decimal("0.50"))
            vat_rows[0]["ErrorScenarioCode"] = code

    def _inject_invalids(self) -> None:
        target_invalid = int(round(self.config.n_documents * self.config.invalid_share))
        invalid_headers: list[dict] = []
        used_ids: set[str] = set()

        for code, _, _, _ in ERROR_SCENARIOS:
            if len(invalid_headers) >= target_invalid:
                break
            candidates = self._find_candidates_for_error(code, used_ids)
            if not candidates:
                continue
            header = self.rng.choice(candidates)
            used_ids.add(header["InvoiceID"])
            self._apply_error_to_invoice(header, code)
            invalid_headers.append(header)

        remaining = target_invalid - len(invalid_headers)
        all_codes = [item[0] for item in ERROR_SCENARIOS]
        while remaining > 0:
            code = self.rng.choice(all_codes)
            candidates = self._find_candidates_for_error(code, used_ids)
            if not candidates:
                break
            header = self.rng.choice(candidates)
            used_ids.add(header["InvoiceID"])
            self._apply_error_to_invoice(header, code)
            invalid_headers.append(header)
            remaining -= 1

    def _find_candidates_for_error(self, code: str, used_ids: set[str]) -> list[dict]:
        candidates = [h for h in self.headers if h["InvoiceID"] not in used_ids]
        if code in {"ERR01_MISSING_BUYER_TRN", "ERR02_BAD_TRN_LENGTH"}:
            return [h for h in candidates if h["BuyerCountry"] == "AE"]
        if code == "ERR07_NEG_QTY_ON_380":
            return [h for h in candidates if h["InvoiceTypeCode"] == "380"]
        if code == "ERR09_CREDIT_NO_REFERENCE":
            return [h for h in candidates if h["InvoiceTypeCode"] == "381"]
        return candidates

    def write_output(self, output_dir: Path) -> Path:
        timestamp = datetime.utcnow()
        run_id = f"run_{timestamp.strftime('%Y%m%dT%H%M%SZ')}_{self.config.seed}"
        run_dir = output_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=False)

        self._write_csv(
            run_dir / "invoice_headers.csv",
            self.headers,
            [
                "InvoiceID",
                "InvoiceTypeCode",
                "InvoiceStatus",
                "IssueDate",
                "DueDate",
                "CurrencyCode",
                "SellerID",
                "SellerTRN",
                "BuyerID",
                "BuyerTRN",
                "BuyerCountry",
                "PaymentTermCode",
                "OriginalInvoiceID",
                "TaxExclusiveAmount",
                "TaxAmount",
                "TaxInclusiveAmount",
                "PayableAmount",
                "ErrorScenarioCode",
            ],
        )
        self._write_csv(
            run_dir / "invoice_lines.csv",
            self.lines,
            [
                "LineID",
                "InvoiceID",
                "LineNumber",
                "ItemCode",
                "ItemDescription",
                "Quantity",
                "UnitOfMeasure",
                "UnitPrice",
                "LineAllowanceAmount",
                "LineChargeAmount",
                "LineExtensionAmount",
                "TaxCategory",
                "TaxRate",
                "TaxAmount",
                "ErrorScenarioCode",
            ],
        )
        self._write_csv(
            run_dir / "invoice_vat_breakdown.csv",
            self.vat_breakdown,
            ["InvoiceID", "TaxCategory", "TaxRate", "TaxableAmount", "TaxAmount", "ErrorScenarioCode"],
        )
        self._write_csv(
            run_dir / "customers.csv",
            self.customers,
            ["CustomerID", "BuyerName", "BuyerCountry", "BuyerTRN", "Industry", "CustomerTier"],
        )
        self._write_csv(
            run_dir / "items.csv",
            self.items,
            ["ItemCode", "ItemName", "ItemCategory", "ItemVATClass", "DefaultPriceBand"],
        )
        self._write_csv(
            run_dir / "error_scenarios.csv",
            [
                {
                    "ErrorScenarioCode": code,
                    "ErrorType": err_type,
                    "Category": category,
                    "Description": err_type,
                    "ExpectedValidationFailure": expected,
                }
                for code, err_type, category, expected in ERROR_SCENARIOS
            ],
            ["ErrorScenarioCode", "ErrorType", "Category", "Description", "ExpectedValidationFailure"],
        )

        generation_config = {
            **self.config.__dict__,
            "run_id": run_id,
            "generated_at_utc": timestamp.isoformat(timespec="seconds") + "Z",
        }
        (run_dir / "generation_config.json").write_text(json.dumps(generation_config, indent=2), encoding="utf-8")

        invalid_count = sum(1 for row in self.headers if row["ErrorScenarioCode"])
        manifest = {
            "dataset_identifier": run_id,
            "document_version": self.config.document_version,
            "schema_version": self.config.schema_version,
            "generation_timestamp_utc": timestamp.isoformat(timespec="seconds") + "Z",
            "total_documents": len(self.headers),
            "invoice_count": sum(1 for row in self.headers if row["InvoiceTypeCode"] == "380"),
            "credit_note_count": sum(1 for row in self.headers if row["InvoiceTypeCode"] == "381"),
            "total_line_items": len(self.lines),
            "invalid_document_count": invalid_count,
            "invalid_document_share": round(invalid_count / len(self.headers), 4),
            "files": {
                "invoice_headers.csv": len(self.headers),
                "invoice_lines.csv": len(self.lines),
                "invoice_vat_breakdown.csv": len(self.vat_breakdown),
                "customers.csv": len(self.customers),
                "items.csv": len(self.items),
                "error_scenarios.csv": len(ERROR_SCENARIOS),
            },
        }
        (run_dir / "run_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        readme = "\n".join(
            [
                f"# {run_id}",
                "",
                "Synthetic UAE e-invoicing dataset generated from the BRD cleanup baseline.",
                "",
                "Files:",
                "- invoice_headers.csv: one row per invoice or credit note",
                "- invoice_lines.csv: one row per invoice line",
                "- invoice_vat_breakdown.csv: one row per invoice and tax category subtotal",
                "- customers.csv: synthetic customer master",
                "- items.csv: synthetic item catalogue",
                "- error_scenarios.csv: invalid scenario dictionary",
                "- generation_config.json: parameters and seed values",
                "- run_manifest.json: counts and version metadata",
            ]
        )
        (run_dir / "README.md").write_text(readme, encoding="utf-8")

        return run_dir

    @staticmethod
    def _write_csv(path: Path, rows: Iterable[dict], fieldnames: list[str]) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow({field: row.get(field, "") for field in fieldnames})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic UAE e-invoicing test data.")
    parser.add_argument("--output-dir", default="output", help="Base output directory for generated runs.")
    parser.add_argument("--n-documents", type=int, default=5000, help="Total document count including credit notes.")
    parser.add_argument("--seed", type=int, default=20260303, help="Random seed for deterministic generation.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = Config(n_documents=args.n_documents, seed=args.seed)
    generator = Generator(config)
    generator.generate()
    run_dir = generator.write_output(Path(args.output_dir))
    print(run_dir)


if __name__ == "__main__":
    main()
