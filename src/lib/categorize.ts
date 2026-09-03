import type { ScopedDb } from "@/lib/user-scope";
import { decryptIban, normalizeIban } from "@/lib/iban";
import { DEFAULT_CATEGORIES, TRANSFERS, INCOME, UNCATEGORIZED } from "@/lib/categories";

/**
 * Lightweight keyword-based categorizer for common Dutch/ING merchants.
 * This is a stand-in for the full Rules engine (Phase 3) — enough to power
 * the Overview dashboard's category breakdown without building the whole
 * rules UI yet.
 */
const KEYWORD_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "Groceries",
    keywords: ["ALBERT HEIJN", " AH ", "JUMBO", "LIDL", "PLUS ", "DIRK", "ALDI", "COOP", "VOMAR", "SPAR"],
  },
  {
    category: "Transport",
    keywords: ["NS ", "NS-", "SHELL", "ESSO", " BP ", "TOTAL", "TANKSTATION", "Q-PARK", "GVB", "RET ", "CONNEXXION", "UBER", "OV-CHIPKAART"],
  },
  {
    category: "Subscriptions",
    keywords: ["NETFLIX", "SPOTIFY", "DISNEY+", "DISNEY PLUS", "HBO", "AMAZON PRIME", "YOUTUBE PREMIUM", "APPLE.COM/BILL", "VIDEOLAND"],
  },
  {
    category: "Restaurants",
    keywords: ["MCDONALD", "KFC", "THUISBEZORGD", "UBER EATS", "DOMINO", "RESTAURANT", "CAFE ", "STARBUCKS", "BURGER KING", "SUBWAY"],
  },
  {
    category: "Housing",
    keywords: ["HUUR", "HYPOTHEEK", "VVE ", "WOZ", "WONINGSTICHTING", "VERHUURDER"],
  },
  {
    category: "Utilities",
    keywords: ["VATTENFALL", "EON", "E.ON", "ENECO", "ESSENT", "WATERBEDRIJF", "ZIGGO", "KPN", "VODAFONE", "ODIDO", "T-MOBILE"],
  },
  {
    category: "Health",
    keywords: ["APOTHEEK", "HUISARTS", "TANDARTS", "FYSIOTHERAPIE"],
  },
  {
    // Health insurance premiums are a fixed monthly bill, unlike ad-hoc apotheek/huisarts
    // visits — grouped under Insurance rather than Health for that reason.
    category: "Insurance",
    keywords: [
      "VERZEKERING",
      "ZORGVERZEKERAAR",
      " CZ ",
      "VGZ",
      "ZILVEREN KRUIS",
      "MENZIS",
      "ASR ",
      "INTERPOLIS",
      "CENTRAAL BEHEER",
      "UNIVE",
      "FBTO",
    ],
  },
  {
    category: "Shopping",
    keywords: ["BOL.COM", "ZALANDO", "H&M", " ZARA", "IKEA", "MEDIAMARKT", "COOLBLUE", "ACTION", "HEMA", "AMAZON"],
  },
  {
    category: "Entertainment",
    keywords: ["PATHE", "KINEPOLIS", "BIOSCOOP", "TICKETMASTER", "PICKX", "STEAM", "PLAYSTATION"],
  },
  {
    category: "Travel",
    keywords: ["BOOKING.COM", "TRANSAVIA", " KLM ", "RYANAIR", "AIRBNB", "EASYJET", "NS INTERNATIONAL"],
  },
  {
    category: "Education",
    keywords: ["UNIVERSITEIT", "HOGESCHOOL", "DUO ", "COLLEGEGELD"],
  },
  {
    category: "Personal care",
    keywords: ["KAPPER", "SALON", "SEPHORA", "ETOS", "KRUIDVAT"],
  },
  {
    category: "Fees",
    keywords: ["AFSCHRIJVINGSKOSTEN", "MAANDELIJKSE KOSTEN", "BANKKOSTEN"],
  },
];

function normalizeDescription(description: string): string {
  return ` ${description.toUpperCase()} `;
}

function matchKeywordCategory(description: string): string | null {
  const normalized = normalizeDescription(description);
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }
  return null;
}

/** Idempotently ensures the default category set exists. */
export async function ensureDefaultCategories(tx: ScopedDb): Promise<Map<string, string>> {
  // tx is already inside a transaction, so these upserts run sequentially
  // against it rather than via db.$transaction([...]) (nested transactions
  // aren't supported).
  for (const cat of DEFAULT_CATEGORIES) {
    await tx.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, type: cat.type, color: cat.slot, isSystemCategory: true },
    });
  }
  const categories = await tx.category.findMany();
  return new Map(categories.map((c) => [c.name, c.id]));
}

/**
 * Categorizes and flags transfers for every transaction on the given
 * accounts that hasn't been categorized yet. Transfers are detected by
 * matching the counterparty IBAN against the user's other own accounts.
 */
export async function categorizeUncategorizedTransactions(tx: ScopedDb, userId: string): Promise<void> {
  const categoryIdByName = await ensureDefaultCategories(tx);

  const ownAccounts = await tx.account.findMany({ where: { userId } });
  const ownIbans = new Set(ownAccounts.map((a) => normalizeIban(decryptIban(a.ibanEncrypted))));

  const uncategorized = await tx.transaction.findMany({
    where: { categoryId: null, userId },
  });

  for (const txn of uncategorized) {
    const counterpartyIban = txn.counterpartyIbanEncrypted ? decryptIban(txn.counterpartyIbanEncrypted) : null;
    const isTransfer = counterpartyIban ? ownIbans.has(normalizeIban(counterpartyIban)) : false;

    let categoryName: string;
    if (isTransfer) {
      categoryName = TRANSFERS;
    } else if (txn.direction === "INCOME") {
      categoryName = INCOME;
    } else {
      categoryName = matchKeywordCategory(txn.description) ?? UNCATEGORIZED;
    }

    await tx.transaction.update({
      where: { id: txn.id },
      data: {
        categoryId: categoryIdByName.get(categoryName) ?? null,
        isTransfer,
      },
    });
  }
}
