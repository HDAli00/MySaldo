import Papa from "papaparse";

/**
 * Parser for ING Netherlands CSV exports.
 * Columns per https://support.yuki.nl/en/support/solutions/articles/80000787467-ing-bank-export-files
 */

export const REQUIRED_COLUMNS = [
  "Datum",
  "Naam / Omschrijving",
  "Rekening",
  "Tegenrekening",
  "Code",
  "Af Bij",
  "Bedrag (EUR)",
  "Mutatiesoort",
  "Mededelingen",
  "Saldo na mutatie",
] as const;

export interface IngRow {
  datum: string;
  naamOmschrijving: string;
  rekening: string;
  tegenrekening: string;
  code: string;
  afBij: string;
  bedragEur: string;
  mutatiesoort: string;
  mededelingen: string;
  saldoNaMutatie: string;
  tag: string;
}

export interface ParsedIngTransaction {
  rowNumber: number;
  transactionDate: Date;
  description: string;
  accountIban: string;
  counterpartyIban: string | null;
  mutationCode: string;
  direction: "INCOME" | "EXPENSE";
  amount: number;
  mutationType: string;
  mededelingen: string;
  balanceAfterTransaction: number | null;
  tag: string | null;
}

export interface RowError {
  rowNumber: number;
  message: string;
}

export interface ParsedIngCsv {
  transactions: ParsedIngTransaction[];
  errors: RowError[];
  missingColumns: string[];
  totalRows: number;
}

/** Strips a UTF-8 BOM and normalizes line endings. */
function cleanFileContent(content: string): string {
  return content.replace(/^﻿/, "");
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, " ");
}

/** ING dates are usually YYYYMMDD; some exports use DD-MM-YYYY. */
function parseDutchDate(value: string, rowNumber: number, errors: RowError[]): Date | null {
  const trimmed = value.trim();

  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const dashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  errors.push({ rowNumber, message: `Invalid Datum value: "${value}"` });
  return null;
}

/** ING amounts use a comma as the decimal separator and a dot as thousands separator. */
function parseDutchAmount(value: string, rowNumber: number, errors: RowError[]): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    errors.push({ rowNumber, message: "Missing Bedrag (EUR) value" });
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  if (Number.isNaN(amount)) {
    errors.push({ rowNumber, message: `Invalid Bedrag (EUR) value: "${value}"` });
    return null;
  }
  return amount;
}

export function parseIngCsv(fileContent: string): ParsedIngCsv {
  const content = cleanFileContent(fileContent);

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detect: ING exports use comma, some regional variants use semicolon
    transformHeader: normalizeHeader,
  });

  const headers = parsed.meta.fields ?? [];
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  const transactions: ParsedIngTransaction[] = [];
  const errors: RowError[] = [];

  if (missingColumns.length > 0) {
    return { transactions, errors, missingColumns, totalRows: 0 };
  }

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // account for header row, 1-indexed

    const datum = row["Datum"] ?? "";
    const rekening = (row["Rekening"] ?? "").trim();
    const afBij = (row["Af Bij"] ?? "").trim();
    const bedrag = row["Bedrag (EUR)"] ?? "";

    if (!rekening) {
      errors.push({ rowNumber, message: "Missing Rekening (account IBAN)" });
      return;
    }

    const transactionDate = parseDutchDate(datum, rowNumber, errors);
    if (!transactionDate) return;

    const amount = parseDutchAmount(bedrag, rowNumber, errors);
    if (amount === null) return;

    let direction: "INCOME" | "EXPENSE";
    if (afBij === "Af") {
      direction = "EXPENSE";
    } else if (afBij === "Bij") {
      direction = "INCOME";
    } else {
      errors.push({ rowNumber, message: `Unrecognized Af Bij value: "${afBij}"` });
      return;
    }

    const saldoRaw = row["Saldo na mutatie"] ?? "";
    const balanceAfterTransaction = saldoRaw.trim()
      ? parseDutchAmount(saldoRaw, rowNumber, [])
      : null;

    const tegenrekening = (row["Tegenrekening"] ?? "").trim();

    transactions.push({
      rowNumber,
      transactionDate,
      description: (row["Naam / Omschrijving"] ?? "").trim(),
      accountIban: rekening,
      counterpartyIban: tegenrekening || null,
      mutationCode: (row["Code"] ?? "").trim(),
      direction,
      amount: Math.abs(amount),
      mutationType: (row["Mutatiesoort"] ?? "").trim(),
      mededelingen: (row["Mededelingen"] ?? "").trim(),
      balanceAfterTransaction,
      tag: (row["Tag"] ?? "").trim() || null,
    });
  });

  return { transactions, errors, missingColumns, totalRows: parsed.data.length };
}
