import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
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

async function getOrCreateAccount(userId: string, iban: string) {
  const normalized = normalizeIban(iban);
  const existingAccounts = await db.account.findMany({ where: { userId } });

  for (const account of existingAccounts) {
    // iban_encrypted values are non-deterministic (random IV), so we compare by decrypting.
    if (normalizeIban(decryptIban(account.ibanEncrypted)) === normalized) {
      return account;
    }
  }

  const lastFour = ibanLastFour(normalized);
  return db.account.create({
    data: {
      userId,
      name: `ING Account ····${lastFour}`,
      ibanEncrypted: encryptIban(normalized),
      ibanLastFour: lastFour,
      bankName: "ING",
    },
  });
}

export async function runIngImport(
  userId: string,
  fileName: string,
  fileContent: string
): Promise<ImportReport> {
  const fileHash = hashFile(fileContent);

  const existingImport = await db.import.findUnique({
    where: { userId_fileHash: { userId, fileHash } },
  });
  if (existingImport) {
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
    const failedImport = await db.import.create({
      data: {
        userId,
        fileName,
        fileHash,
        status: "FAILED",
        rowsSeen: 0,
        rowsImported: 0,
        duplicatesSkipped: 0,
        errors: [{ message: `Missing required columns: ${missingColumns.join(", ")}` }],
      },
    });
    return {
      importId: failedImport.id,
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

  const accountByIban = new Map<string, Awaited<ReturnType<typeof getOrCreateAccount>>>();
  for (const row of transactions) {
    const normalized = normalizeIban(row.accountIban);
    if (!accountByIban.has(normalized)) {
      accountByIban.set(normalized, await getOrCreateAccount(userId, normalized));
    }
  }

  const dates = transactions.map((t) => t.transactionDate.getTime());
  const dateFrom = dates.length ? new Date(Math.min(...dates)) : null;
  const dateTo = dates.length ? new Date(Math.max(...dates)) : null;

  const importRecord = await db.import.create({
    data: {
      userId,
      fileName,
      fileHash,
      status: "PROCESSING",
      accountId: transactions.length
        ? accountByIban.get(normalizeIban(transactions[0].accountIban))!.id
        : null,
      rowsSeen: totalRows,
      dateFrom,
      dateTo,
      errors: errors.length ? (errors as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  let rowsImported = 0;
  let duplicatesSkipped = 0;

  for (const row of transactions) {
    const account = accountByIban.get(normalizeIban(row.accountIban))!;
    const fingerprint = fingerprintRow(row.accountIban, row);

    const existing = await db.transaction.findUnique({
      where: { duplicateFingerprint: fingerprint },
    });
    if (existing) {
      duplicatesSkipped += 1;
      continue;
    }

    await db.transaction.create({
      data: {
        accountId: account.id,
        transactionDate: row.transactionDate,
        description: row.description,
        counterpartyIbanEncrypted: row.counterpartyIban ? encryptIban(row.counterpartyIban) : null,
        counterpartyIbanLastFour: row.counterpartyIban ? ibanLastFour(row.counterpartyIban) : null,
        amount: row.amount,
        direction: row.direction,
        mutationCode: row.mutationCode || null,
        mutationType: row.mutationType || null,
        balanceAfterTransaction: row.balanceAfterTransaction,
        tag: row.tag,
        sourceImportId: importRecord.id,
        duplicateFingerprint: fingerprint,
      },
    });
    rowsImported += 1;
  }

  await db.import.update({
    where: { id: importRecord.id },
    data: { status: "COMPLETED", rowsImported, duplicatesSkipped },
  });

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
        await db.account.update({
          where: { id: account.id },
          data: {
            latestBalance: latestRow.balanceAfterTransaction,
            latestTransactionDate: latestRow.transactionDate,
          },
        });
      }
    }
  }

  await categorizeUncategorizedTransactions(userId);

  return {
    importId: importRecord.id,
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
