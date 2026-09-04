import type {
  Account,
  AccountRow,
  Category,
  CategoryRow,
  Import,
  ImportRow,
  Transaction,
  TransactionRow,
  User,
  UserRow,
} from "./types";

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    currency: row.currency,
    createdAt: new Date(row.created_at),
  };
}

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    ibanEncrypted: row.iban_encrypted,
    ibanLastFour: row.iban_last_four,
    bankName: row.bank_name,
    accountType: row.account_type,
    latestBalance: row.latest_balance !== null ? Number(row.latest_balance) : null,
    latestTransactionDate: row.latest_transaction_date ? new Date(row.latest_transaction_date) : null,
    createdAt: new Date(row.created_at),
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    isSystemCategory: row.is_system_category,
  };
}

export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    transactionDate: new Date(row.transaction_date),
    description: row.description,
    merchant: row.merchant,
    counterpartyIbanEncrypted: row.counterparty_iban_encrypted,
    counterpartyIbanLastFour: row.counterparty_iban_last_four,
    amount: Number(row.amount),
    direction: row.direction,
    categoryId: row.category_id,
    mutationCode: row.mutation_code,
    mutationType: row.mutation_type,
    balanceAfterTransaction: row.balance_after_transaction !== null ? Number(row.balance_after_transaction) : null,
    tag: row.tag,
    isTransfer: row.is_transfer,
    isRecurring: row.is_recurring,
    notes: row.notes,
    sourceImportId: row.source_import_id,
    duplicateFingerprint: row.duplicate_fingerprint,
    createdAt: new Date(row.created_at),
  };
}

export function mapImport(row: ImportRow): Import {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    accountId: row.account_id,
    fileHash: row.file_hash,
    status: row.status,
    importedAt: new Date(row.imported_at),
    dateFrom: row.date_from ? new Date(row.date_from) : null,
    dateTo: row.date_to ? new Date(row.date_to) : null,
    rowsSeen: row.rows_seen,
    rowsImported: row.rows_imported,
    duplicatesSkipped: row.duplicates_skipped,
    errors: row.errors,
  };
}
