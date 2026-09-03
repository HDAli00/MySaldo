import { ImportUploader } from "@/components/ImportUploader";

export default function ImportsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Imports</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Upload an ING Netherlands CSV export. Saldo detects the account, validates the file,
        skips duplicate transactions automatically, and reports what happened.
      </p>
      <ImportUploader />
    </div>
  );
}
