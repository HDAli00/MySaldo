export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Overview</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        The monthly overview dashboard (balances, income vs. expenses, budget status, and
        forecast preview) ships in Phase 2 once categorization and transfer detection are in
        place. For now, head to <strong>Imports</strong> to upload an ING CSV, then check{" "}
        <strong>Accounts</strong> and <strong>Transactions</strong> to see what was imported.
      </p>
    </div>
  );
}
