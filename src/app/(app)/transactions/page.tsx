import { Suspense } from "react";
import { TransactionsView } from "@/components/TransactionsView";

export default function TransactionsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Transactions</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Search and filter every imported transaction.
      </p>
      <Suspense fallback={null}>
        <TransactionsView />
      </Suspense>
    </div>
  );
}
