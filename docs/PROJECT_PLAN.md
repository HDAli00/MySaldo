# Saldo — Personal Finance Application Plan

## 1. Project summary

Saldo is a privacy-first personal finance web application for importing ING Netherlands CSV exports, organizing transactions by account and category, understanding spending patterns, forecasting the next month, and managing budgets.

The first release focuses on manually imported CSV files rather than direct bank connectivity. This keeps the initial product simple, portable, and under the user's control while leaving room for additional bank formats later.

The linked ING/Yuki documentation identifies these relevant CSV fields:

- `Datum`
- `Naam / Omschrijving`
- `Rekening`
- `Tegenrekening`
- `Code`
- `Af Bij`
- `Bedrag (EUR)`
- `Mutatiesoort`
- `Mededelingen`
- `Saldo na mutatie`
- `Tag`

Source: <https://support.yuki.nl/en/support/solutions/articles/80000787467-ing-bank-export-files>

## 2. Main goals

### Product goals

1. Make importing ING transactions fast and reliable.
2. Make every transaction traceable, editable, and searchable.
3. Make each IBAN a first-class account that can be analyzed independently.
4. Group expenses into useful categories with rules that improve over time.
5. Show spending, income, transfers, and savings in a simple monthly overview.
6. Help the user set realistic budgets based on historical behavior.
7. Forecast the next month using recurring transactions and recent spending history.
8. Protect financial privacy and make data export and deletion easy.

### Non-goals for the first release

- Direct ING account synchronization
- Investment portfolio management
- Tax filing or accounting advice
- Credit scoring
- Automated financial decisions
- Shared household accounts and multi-user permissions
- Native iOS or Android applications

## 3. Product principles

### Account-first

The user can always switch between:

- All accounts
- One specific ING account
- Future accounts from other banks

Every dashboard, chart, budget, forecast, and transaction view must respect the selected account scope.

### Explainable numbers

The user must be able to click a total and see the transactions behind it. Forecasts should show their assumptions instead of presenting unexplained predictions.

### Transfers are not expenses

Transfers between the user's own accounts must be identified and excluded from expense totals. The `Rekening` and `Tegenrekening` IBAN fields are used to assist with this classification.

### Corrections improve the system

When the user changes a transaction category or merchant, Saldo can offer to create a reusable rule for future matching transactions.

### Privacy by default

Only the data required for the product should be stored. IBANs are masked in the interface, original files are not modified, and the user can export or delete their data.

## 4. Primary navigation

1. Overview
2. Accounts
3. Transactions
4. Budgets
5. Forecast
6. Rules
7. Imports
8. Settings

The currently selected account scope should be visible in the application header at all times.

## 5. Pages and their main goals

## 5.1 Overview page

### Goal

Give the user a quick answer to: “What happened to my money this month, and am I on track?”

### Main content

- Selected month
- Selected account scope
- Current balance
- Total income
- Total expenses
- Net cash flow
- Savings rate
- Spending by category
- Budget status
- Forecast preview
- Recent transactions
- Important insights

### Main processes

1. User selects `All accounts` or a specific account.
2. User chooses a month.
3. Saldo calculates totals for the selected scope and period.
4. User clicks a metric or category.
5. Saldo opens the filtered Transactions page.

### Success criteria

- The user understands the current month's financial position within a few seconds.
- Every displayed total can be opened and verified.
- Transfers do not inflate expense totals.

## 5.2 Accounts page

### Goal

Show all detected bank accounts and let the user understand each account separately.

### Main content

- Account name
- Masked IBAN, for example `ING Current ····4821`
- Account type, if known
- Current or latest imported balance
- Last imported transaction date
- Income and expenses for the selected month
- Balance trend
- Import status

### Main processes

1. Saldo detects the user's own IBAN from the `Rekening` column during import.
2. Saldo creates or updates an account record.
3. User selects an account.
4. Saldo opens the account detail view with all calculations scoped to that IBAN.

### Account detail view

- Balance history
- Monthly inflows and outflows
- Category breakdown
- Recurring payments
- Transfers in and out
- Uncategorized transactions
- Account-specific budgets

### Success criteria

- The user can distinguish accounts without exposing full IBANs.
- The user can quickly identify which account paid for an expense.
- Account-specific analysis remains separate from the all-account overview.

## 5.3 Transactions page

### Goal

Provide a trustworthy, searchable source of truth for all imported financial activity.

### Main content

- Date
- Merchant or description
- Amount
- Income or expense indicator
- Category
- Account
- Counterparty IBAN, masked
- Transfer status
- Recurring status
- Notes

### Filters

- Account
- Date range
- Month
- Category
- Income or expense
- Merchant
- Amount range
- Transfer status
- Recurring status
- Uncategorized only

### Main processes

1. User searches or filters transactions.
2. User opens a transaction.
3. User edits the category, merchant, type, or notes.
4. User optionally marks the transaction as a transfer or recurring payment.
5. User can create a categorization rule from the correction.
6. Saldo recalculates affected monthly totals, budgets, insights, and forecasts.

### Special cases

- A transaction can be split across multiple categories.
- A bank transfer can be excluded from spending.
- Refunds should reduce the relevant expense category rather than being treated as ordinary income when appropriate.
- Unrecognized transactions remain visible and are never silently categorized without a traceable reason.

### Success criteria

- The user can find any imported transaction quickly.
- Bulk categorization is possible.
- Changes are reflected immediately in related summaries.

## 5.4 Budgets page

### Goal

Help the user decide how much to spend per category and monitor progress through the month.

### Main content

- Monthly budget selector
- Account scope selector
- Category budget cards
- Spent amount
- Remaining amount
- Percentage used
- Projected month-end amount
- Previous-month comparison
- Optional rollover amount

### Default categories

- Housing
- Utilities
- Groceries
- Restaurants
- Transport
- Shopping
- Health
- Insurance
- Subscriptions
- Entertainment
- Travel
- Education
- Personal care
- Fees
- Income
- Transfers
- Uncategorized

### Main processes

1. User selects a month and account scope.
2. User creates or edits a category budget.
3. Saldo calculates actual spending from categorized transactions.
4. Saldo displays progress and threshold warnings.
5. Saldo optionally suggests a budget based on recent history.
6. User can accept, edit, or ignore the suggestion.

### Budget thresholds

- 70% used: neutral attention indicator
- 90% used: warning indicator
- 100% used: over-budget indicator

### Success criteria

- The user knows which categories need attention.
- Budget progress is based on actual transactions, excluding transfers.
- Budget suggestions are clearly labeled as suggestions.

## 5.5 Forecast page

### Goal

Estimate next month's income, expenses, and available amount in a way the user can understand.

### Forecast components

1. Expected recurring payments
2. Expected income
3. Typical category spending
4. Known transfers
5. Estimated month-end balance

### Confidence levels

- High: stable recurring transaction with consistent amount and interval
- Medium: recurring pattern with some variation
- Low: estimate based mainly on a small or inconsistent history

### Main processes

1. Saldo reviews the last 3–6 months of transactions.
2. Saldo detects repeated merchants, intervals, and amounts.
3. Saldo separates recurring expenses from variable spending.
4. Saldo calculates a weighted average for variable categories.
5. Saldo generates the next-month estimate.
6. User opens the explanation to see which transactions contributed.

### Forecast display

```text
Expected income             €3,250
Recurring payments          €1,340
Typical variable spending     €950
Expected expenses           €2,290
Expected leftover              €960
Confidence                   Medium
```

### Success criteria

- The user sees both the forecast and the reasoning behind it.
- Recurring expenses are not hidden inside a generic total.
- The forecast can be viewed for all accounts or one account.

## 5.6 Rules page

### Goal

Give the user control over automatic categorization and merchant cleanup.

### Example rules

```text
Description contains "ALBERT HEIJN"  → Groceries
Description contains "NS"             → Transport
Counterparty IBAN equals [masked]     → Transfer
Merchant equals "Netflix"             → Subscriptions
```

### Main processes

1. User creates a rule from scratch or from a corrected transaction.
2. User sets the matching condition.
3. User chooses the target category or transaction type.
4. Saldo previews affected transactions.
5. User applies the rule.
6. Saldo records the rule and reprocesses matching transactions.

Rules should have an explicit priority order so that specific rules override broad rules.

## 5.7 Imports page

### Goal

Make CSV importing safe, transparent, and repeatable.

### Main content

- Upload area
- Supported format information
- Import history
- File name
- Account detected
- Date range
- Number of rows
- Number imported
- Number skipped as duplicates
- Number needing review
- Import errors

### ING import process

1. User selects an ING CSV file.
2. Saldo detects the delimiter, encoding, and ING column names.
3. Saldo validates required columns.
4. Saldo parses Dutch dates and EUR amounts.
5. Saldo identifies the account from `Rekening`.
6. Saldo previews the date range and transaction count.
7. Saldo calculates duplicate fingerprints.
8. User reviews the import preview.
9. Saldo stores new transactions and skips exact duplicates.
10. Saldo runs transfer, merchant, category, and recurring detection.
11. Saldo displays the completed import report.

### Validation rules

- Required columns must be present.
- `Datum` must be a valid date.
- `Bedrag (EUR)` must parse as a valid amount.
- `Af Bij` must map to income or expense.
- `Rekening` must contain a valid or recognizable IBAN.
- Duplicate rows must not be imported twice.
- `Saldo na mutatie` should be retained and can be used for balance validation.

The original bank export must not be edited by the user before import because changes can damage the expected file structure.

## 5.8 Settings page

### Goal

Allow the user to control personal preferences and data privacy.

### Settings

- Default account scope
- Default currency
- Month start preference
- Category management
- Account naming
- Import preferences
- Forecast history range
- Data export
- Delete all data

### Privacy processes

1. User requests an export.
2. Saldo generates a portable CSV or JSON archive.
3. User confirms permanent deletion.
4. Saldo deletes transactions, imports, rules, budgets, and account records.

Deletion must be explicit and irreversible.

## 6. Cross-page processes

## 6.1 First-time setup

1. User opens Saldo.
2. User creates an account or continues with local demo data.
3. User uploads an ING CSV.
4. Saldo detects the account IBAN.
5. User gives the account a friendly name.
6. Saldo imports transactions.
7. Saldo shows the first overview.
8. User reviews uncategorized transactions.
9. Saldo offers to create rules from corrections.

## 6.2 Monthly review

1. User opens Overview.
2. User selects the month.
3. User reviews income, expenses, and net cash flow.
4. User checks unusual category changes.
5. User reviews budget progress.
6. User checks the forecast for next month.
7. User categorizes remaining unknown transactions.

## 6.3 Regular import

1. User downloads a new ING CSV for one account.
2. User uploads the file.
3. Saldo recognizes the existing account.
4. Saldo skips previously imported transactions.
5. Saldo imports only new transactions.
6. Saldo updates balances and analytics.
7. Saldo reports the result.

## 6.4 Correcting a category

1. User opens an uncategorized or incorrectly categorized transaction.
2. User changes the category.
3. Saldo asks whether similar future transactions should use this category.
4. User previews the matching transactions.
5. User confirms or rejects the rule.
6. Saldo updates the relevant summaries.

## 6.5 Investigating a spending change

1. User sees that a category increased.
2. User clicks the category chart or budget card.
3. Saldo opens filtered transactions.
4. User groups the results by merchant or date.
5. User identifies the cause.
6. User can adjust the budget or create a rule.

## 7. Data model outline

### User

- `id`
- `currency`
- `created_at`

### Account

- `id`
- `user_id`
- `name`
- `iban_encrypted`
- `iban_last_four`
- `bank_name`
- `account_type`
- `latest_balance`
- `latest_transaction_date`

### Transaction

- `id`
- `account_id`
- `transaction_date`
- `description`
- `merchant`
- `counterparty_iban_encrypted`
- `amount`
- `direction`
- `category_id`
- `mutation_code`
- `mutation_type`
- `balance_after_transaction`
- `tag`
- `is_transfer`
- `is_recurring`
- `notes`
- `source_import_id`
- `duplicate_fingerprint`

### Category

- `id`
- `name`
- `type`
- `color`
- `is_system_category`

### Categorization rule

- `id`
- `condition_type`
- `condition_value`
- `category_id`
- `transaction_type`
- `priority`
- `enabled`

### Budget

- `id`
- `account_scope`
- `category_id`
- `month`
- `amount`
- `rollover_enabled`

### Recurring payment

- `id`
- `account_id`
- `merchant`
- `expected_amount`
- `frequency`
- `next_expected_date`
- `confidence`

### Import

- `id`
- `file_name`
- `account_id`
- `file_hash`
- `imported_at`
- `date_from`
- `date_to`
- `rows_seen`
- `rows_imported`
- `duplicates_skipped`
- `errors`

## 8. Technical implementation plan

### Frontend

- Responsive React web application
- Account scope selector in the global header
- Reusable data cards, charts, filters, and transaction drawers
- Accessible color and typography system
- Desktop-first analytical layouts that remain usable on mobile

### Backend

- API for accounts, transactions, categories, rules, budgets, forecasts, and imports
- CSV parsing and validation service
- Duplicate detection service
- Categorization service
- Recurring transaction detection
- Forecast calculation service

### Storage

- PostgreSQL for structured financial data
- Encrypted sensitive identifiers
- Optional temporary storage for uploaded files
- Audit metadata for import and categorization changes

### Forecasting approach

Start with deterministic calculations:

- Recurring transaction interval detection
- Weighted category averages
- Recent-month weighting
- Income pattern detection
- High/medium/low confidence scoring

Machine learning is not required for the first release.

## 9. Release phases

### Phase 1 — Foundation

- Application shell and navigation
- Account model
- ING CSV upload
- Dutch column parsing
- Transaction storage
- Duplicate detection
- Basic transaction list

### Phase 2 — Understand spending

- Category system
- Manual categorization
- Account detail page
- Overview dashboard
- Search and filters
- Transfer identification

### Phase 3 — Take control

- Budgets
- Budget progress
- Categorization rules
- Bulk editing
- Monthly comparisons

### Phase 4 — Plan ahead

- Recurring payment detection
- Forecast page
- Forecast explanations
- Confidence levels
- Expected leftover calculation

### Phase 5 — Harden and expand

- Data export and deletion
- More robust import error handling
- MT940 and CAMT.053 support
- Additional bank formats
- Optional direct bank connection research

## 10. Definition of done for the first usable version

The first usable version is complete when a user can:

- Upload an ING Netherlands CSV.
- See which IBAN the file belongs to.
- Import transactions without creating duplicates.
- Switch between all accounts and one account.
- View account-specific income and expenses.
- Categorize transactions.
- Exclude internal transfers from expense totals.
- Review spending by category.
- Set at least one monthly budget.
- See budget progress.
- Export their data.
- Delete their data.

Forecasting and automatic categorization should be added after this foundation is reliable, because incorrect imports or account separation would undermine every later feature.