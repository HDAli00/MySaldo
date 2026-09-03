"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImportReportResponse {
  importId: string;
  fileName: string;
  alreadyImported: boolean;
  rowsSeen: number;
  rowsImported: number;
  duplicatesSkipped: number;
  dateFrom: string | null;
  dateTo: string | null;
  accountsTouched: { id: string; name: string; maskedIban: string }[];
  errors: { rowNumber: number; message: string }[];
  missingColumns: string[];
}

interface ImportHistoryEntry {
  id: string;
  fileName: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  importedAt: string;
  dateFrom: string | null;
  dateTo: string | null;
  rowsSeen: number;
  rowsImported: number;
  duplicatesSkipped: number;
  account: { id: string; name: string; maskedIban: string } | null;
}

export function ImportUploader() {
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<ImportReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(() => {
    fetch("/api/imports")
      .then((res) => res.json())
      .then((data: ImportHistoryEntry[]) => setHistory(data))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setReport(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/imports", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      setReport(data as ImportReportResponse);
      loadHistory();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <label htmlFor="csv-file" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          ING CSV file
        </label>
        <input
          ref={fileInputRef}
          id="csv-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
        <button
          type="submit"
          disabled={uploading}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {uploading ? "Importing…" : "Import"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {report && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {report.alreadyImported ? "Already imported" : "Import complete"}: {report.fileName}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <ReportStat label="Rows seen" value={report.rowsSeen} />
            <ReportStat label="Imported" value={report.rowsImported} />
            <ReportStat label="Duplicates skipped" value={report.duplicatesSkipped} />
            <ReportStat label="Row errors" value={report.errors.length} />
          </dl>
          {report.dateFrom && report.dateTo && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Date range: {report.dateFrom} → {report.dateTo}
            </p>
          )}
          {report.accountsTouched.length > 0 && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Account{report.accountsTouched.length > 1 ? "s" : ""}:{" "}
              {report.accountsTouched.map((a) => `${a.name} (${a.maskedIban})`).join(", ")}
            </p>
          )}
          {report.errors.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300">
                {report.errors.length} row{report.errors.length > 1 ? "s" : ""} could not be imported
              </summary>
              <ul className="mt-2 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                {report.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Row {e.rowNumber}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Import history</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Imported</th>
                <th className="px-3 py-2 font-medium">Duplicates</th>
                <th className="px-3 py-2 font-medium">Date range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-zinc-500">
                    No imports yet.
                  </td>
                </tr>
              )}
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{entry.fileName}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.account ? `${entry.account.name} (${entry.account.maskedIban})` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.rowsImported} / {entry.rowsSeen}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.duplicatesSkipped}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {entry.dateFrom && entry.dateTo
                      ? `${entry.dateFrom.slice(0, 10)} → ${entry.dateTo.slice(0, 10)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportHistoryEntry["status"] }) {
  const styles: Record<ImportHistoryEntry["status"], string> = {
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    PROCESSING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
