import { NextRequest, NextResponse } from "next/server";
import { runIngImport } from "@/lib/import";
import { maskIban } from "@/lib/iban";
import { getCurrentAppUser } from "@/lib/require-user";
import { withUserScope } from "@/lib/user-scope";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return withUserScope(user.id, async (tx) => {
    const imports = await tx.import.findMany({
      where: { userId: user.id },
      orderBy: { importedAt: "desc" },
      include: { account: true },
      take: 50,
    });

    return NextResponse.json(
      imports.map((imp) => ({
        id: imp.id,
        fileName: imp.fileName,
        status: imp.status,
        importedAt: imp.importedAt,
        dateFrom: imp.dateFrom,
        dateTo: imp.dateTo,
        rowsSeen: imp.rowsSeen,
        rowsImported: imp.rowsImported,
        duplicatesSkipped: imp.duplicatesSkipped,
        errors: imp.errors,
        account: imp.account
          ? { id: imp.account.id, name: imp.account.name, maskedIban: maskIban(imp.account.ibanLastFour, imp.account.bankName) }
          : null,
      }))
    );
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const report = await withUserScope(user.id, (tx) => runIngImport(tx, user.id, file.name, fileContent));

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
