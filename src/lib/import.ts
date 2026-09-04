import { createHash } from "crypto";
import { supabase } from "@/lib/db";
import { newId } from "@/lib/id";
import { mapAccount, mapImport } from "@/lib/db/map";
import type { Account, AccountRow, ImportRow } from "@/lib/db/types";
import { decryptIban, encryptIban, ibanLastFour, normalizeIban } from "@/lib/iban";
import { parseIngCsv, type ParsedIngTransaction } from "@/lib/csv/ing-parser";
import { categorizeUncategorizedTransactions } from "@/lib/categorize";

export interface ImportReport {
  importId: string;
  fileName: string;
  alreadyImported: boolean;
  rowsSeen: number;
  rowsImported: number;
  duplicatesSkipped: number;
  dateFrom: string | null;
  dateTo: string | null;
  accountsTouched: { id: string; name: string; iban: string }[];
  errors: { rowNumber: number; message: string }[];
  missingColumns: string[];
}

function hashFile(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Deterministic per-row fingerprint used to skip duplicate transactions on re-import. */
function fingerprintRow(accountIban: string, row: ParsedIngTransaction): string {
  const parts = [
    normalizeIban(accountIban),
    row.transactionDate.toISOString().slice(0, 10),
    row.direction,
    row.amount.toFixed(2),
    row.description,
    row.mutationCode,
    row.balanceAfterTransaction?.toFixed(2) ?? "",
  ];
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}

async function getOrCreateAccount(userId: string, iban: string): Promise<Account> {
  const normalized = normalizeIban(iban);
  const { data: existingRows, error: listError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .returns<AccountRow[]>();
  if (listError) throw listError;

  for (const row of existingRows ?? []) {
    // iban_encrypted values are non-deterministic (random IV), so we compare by decrypting.
    if (normalizeIban(decryptIban(row.iban_encrypted)) === normalized) {
      return mapAccount(row);
    }
  }

  const lastFour = ibanLastFour(normalized);
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      id: newId(),
      user_id: userId,
      name: `ING Account ····${lastFour}`,
      iban_encrypted: encryptIban(normalized),
      iban_last_four: lastFour,
      bank_name: "ING",
    })
    .select("*")
    .single<AccountRow>();
  if (error || !data) throw error ?? new Error("Failed to create account.");
  return mapAccount(data);
}

export async function runIngImport(
  userId: string,
  fileName: string,
  fileContent: string
): Promise<ImportReport> {
  const fileHash = hashFile(fileContent);

  const { data: existingImportRow } = await supabase
    .from("imports")
    .select("*")
    .eq("user_id", userId)
    .eq("file_hash", fileHash)
    .maybeSingle<ImportRow>();
  if (existingImportRow) {
    const existingImport = mapImport(existingImportRow);
    return {
      importId: existingImport.id,
      fileName: existingImport.fileName,
      alreadyImported: true,
      rowsSeen: existingImport.rowsSeen,
      rowsImported: existingImport.rowsImported,
      duplicatesSkipped: existingImport.duplicatesSkipped,
      dateFrom: existingImport.dateFrom?.toISOString().slice(0, 10) ?? null,
      dateTo: existingImport.dateTo?.toISOString().slice(0, 10) ?? null,
      accountsTouched: [],
      errors: [],
      missingColumns: [],
    };
  }

  const { transactions, errors, missingColumns, totalRows } = parseIngCsv(fileContent);

  if (missingColumns.length > 0) {
    const { data: failedImportRow, error } = await supabase
      .from("imports")
      .insert({
        id: newId(),
        user_id: userId,
        file_name: fileName,
        file_hash: fileHash,
        status: "FAILED",
        rows_seen: 0,
        rows_imported: 0,
        duplicates_skipped: 0,
        errors: [{ message: `Missing required columns: ${missingColumns.join(", ")}` }],
      })
      .select("*")
      .single<ImportRow>();
    if (error || !failedImportRow) throw error ?? new Error("Failed to record failed import.");

    return {
      importId: failedImportRow.id,
      fileName,
      alreadyImported: false,
      rowsSeen: 0,
      rowsImported: 0,
      duplicatesSkipped: 0,
      dateFrom: null,
      dateTo: null,
      accountsTouched: [],
      errors: [],
      missingColumns,
    };
  }

  const accountByIban = new Map<string, Account>();
  for (const row of transactions) {
    const normalized = normalizeIban(row.accountIban);
    if (!accountByIban.has(normalized)) {
      accountByIban.set(normalized, await getOrCreateAccount(userId, normalized));
    }
  }

  const dates = transactions.map((t) => t.transactionDate.getTime());
  const dateFrom = dates.length ? new Date(Math.min(...dates)) : null;
  const dateTo = dates.length ? new Date(Math.max(...dates)) : null;

  const importId = newId();
  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({
      id: importId,
      user_id: userId,
      file_name: fileName,
      file_hash: fileHash,
      status: "PROCESSING",
      account_id: transactions.length
        ? accountByIban.get(normalizeIban(transactions[0].accountIban))!.id
        : null,
      rows_seen: totalRows,
      date_from: dateFrom ? dateFrom.toISOString() : null,
      date_to: dateTo ? dateTo.toISOString() : null,
      errors: errors.length ? errors : null,
    })
    .select("*")
    .single<ImportRow>();
  if (importError || !importRow) throw importError ?? new Error("Failed to create import.");

  let rowsImported = 0;
  let duplicatesSkipped = 0;

  for (const row of transactions) {
    const account = accountByIban.get(normalizeIban(row.accountIban))!;
    const fingerprint = fingerprintRow(row.accountIban, row);

    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("duplicate_fingerprint", fingerprint)
      .maybeSingle();
    if (existingTx) {
      duplicatesSkipped += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      id: newId(),
      account_id: account.id,
      transaction_date: row.transactionDate.toISOString(),
      description: row.description,
      counterparty_iban_encrypted: row.counterpartyIban ? encryptIban(row.counterpartyIban) : null,
      counterparty_iban_last_four: row.counterpartyIban ? ibanLastFour(row.counterpartyIban) : null,
      amount: row.amount,
      direction: row.direction,
      mutation_code: row.mutationCode || null,
      mutation_type: row.mutationType || null,
      balance_after_transaction: row.balanceAfterTransaction,
      tag: row.tag,
      source_import_id: importRow.id,
      duplicate_fingerprint: fingerprint,
    });
    if (insertError) throw insertError;
    rowsImported += 1;
  }

  await supabase
    .from("imports")
    .update({ status: "COMPLETED", rows_imported: rowsImported, duplicates_skipped: duplicatesSkipped })
    .eq("id", importRow.id);

  // Update each touched account's latest balance / transaction date using the
  // most recent row seen for that account in this file.
  for (const [iban, account] of accountByIban) {
    const rowsForAccount = transactions.filter((t) => normalizeIban(t.accountIban) === iban);
    const latestRow = rowsForAccount.reduce((latest, row) =>
      row.transactionDate > latest.transactionDate ? row : latest
    );
    if (latestRow.balanceAfterTransaction !== null) {
      const currentLatest = account.latestTransactionDate;
      if (!currentLatest || latestRow.transactionDate >= currentLatest) {
        await supabase
          .from("accounts")
          .update({
            latest_balance: latestRow.balanceAfterTransaction,
            latest_transaction_date: latestRow.transactionDate.toISOString(),
          })
          .eq("id", account.id);
      }
    }
  }

  await categorizeUncategorizedTransactions(userId);

  return {
    importId: importRow.id,
    fileName,
    alreadyImported: false,
    rowsSeen: totalRows,
    rowsImported,
    duplicatesSkipped,
    dateFrom: dateFrom?.toISOString().slice(0, 10) ?? null,
    dateTo: dateTo?.toISOString().slice(0, 10) ?? null,
    accountsTouched: Array.from(accountByIban.entries()).map(([iban, account]) => ({
      id: account.id,
      name: account.name,
      iban,
    })),
    errors,
    missingColumns: [],
  };
}
