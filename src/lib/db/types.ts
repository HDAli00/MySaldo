export type TransactionDirection = "INCOME" | "EXPENSE";
export type CategoryType = "INCOME" | "EXPENSE" | "TRANSFER";
export type ImportStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  currency: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  ibanEncrypted: string;
  ibanLastFour: string;
  bankName: string;
  accountType: string | null;
  latestBalance: number | null;
  latestTransactionDate: Date | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  isSystemCategory: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  transactionDate: Date;
  description: string;
  merchant: string | null;
  counterpartyIbanEncrypted: string | null;
  counterpartyIbanLastFour: string | null;
  amount: number;
  direction: TransactionDirection;
  categoryId: string | null;
  mutationCode: string | null;
  mutationType: string | null;
  balanceAfterTransaction: number | null;
  tag: string | null;
  isTransfer: boolean;
  isRecurring: boolean;
  notes: string | null;
  sourceImportId: string;
  duplicateFingerprint: string;
  createdAt: Date;
}

export interface Import {
  id: string;
  userId: string;
  fileName: string;
  accountId: string | null;
  fileHash: string;
  status: ImportStatus;
  importedAt: Date;
  dateFrom: Date | null;
  dateTo: Date | null;
  rowsSeen: number;
  rowsImported: number;
  duplicatesSkipped: number;
  errors: unknown;
}

// Raw row shapes as returned by PostgREST (snake_case columns).

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  currency: string;
  created_at: string;
}

export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  iban_encrypted: string;
  iban_last_four: string;
  bank_name: string;
  account_type: string | null;
  latest_balance: number | null;
  latest_transaction_date: string | null;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  is_system_category: boolean;
}

export interface TransactionRow {
  id: string;
  account_id: string;
  transaction_date: string;
  description: string;
  merchant: string | null;
  counterparty_iban_encrypted: string | null;
  counterparty_iban_last_four: string | null;
  amount: number;
  direction: TransactionDirection;
  category_id: string | null;
  mutation_code: string | null;
  mutation_type: string | null;
  balance_after_transaction: number | null;
  tag: string | null;
  is_transfer: boolean;
  is_recurring: boolean;
  notes: string | null;
  source_import_id: string;
  duplicate_fingerprint: string;
  created_at: string;
}

export interface ImportRow {
  id: string;
  user_id: string;
  file_name: string;
  account_id: string | null;
  file_hash: string;
  status: ImportStatus;
  imported_at: string;
  date_from: string | null;
  date_to: string | null;
  rows_seen: number;
  rows_imported: number;
  duplicates_skipped: number;
  errors: unknown;
}
