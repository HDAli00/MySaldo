import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { runIngImport } from "@/lib/import";
import { maskIban } from "@/lib/iban";
import { getSession } from "@/lib/auth/session";
import type { AccountRow, ImportRow } from "@/lib/db/types";

type ImportWithAccountRow = ImportRow & {
  account: Pick<AccountRow, "id" | "name" | "iban_last_four" | "bank_name"> | null;
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("imports")
    .select("*, account:accounts(id, name, iban_last_four, bank_name)")
    .eq("user_id", session.user.id)
    .order("imported_at", { ascending: false })
    .limit(50)
    .returns<ImportWithAccountRow[]>();
  if (error) throw error;

  return NextResponse.json(
    (data ?? []).map((imp) => ({
      id: imp.id,
      fileName: imp.file_name,
      status: imp.status,
      importedAt: imp.imported_at,
      dateFrom: imp.date_from,
      dateTo: imp.date_to,
      rowsSeen: imp.rows_seen,
      rowsImported: imp.rows_imported,
      duplicatesSkipped: imp.duplicates_skipped,
      errors: imp.errors,
      account: imp.account
        ? { id: imp.account.id, name: imp.account.name, maskedIban: maskIban(imp.account.iban_last_four, imp.account.bank_name) }
        : null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 400 });
  }

  const fileContent = await file.text();

  try {
    const report = await runIngImport(session.user.id, file.name, fileContent);

    if (report.missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `The file is missing required ING columns: ${report.missingColumns.join(", ")}`,
          report,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...report,
      accountsTouched: report.accountsTouched.map((a) => ({
        id: a.id,
        name: a.name,
        maskedIban: maskIban(a.iban.slice(-4)),
      })),
    });
  } catch (error) {
    console.error("Import failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    );
  }
}
