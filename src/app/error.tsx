"use client";

function isDbConnectionError(message: string) {
  return (
    message.includes("PrismaClientInitializationError") ||
    message.includes("Error querying the database") ||
    message.includes("tenant or user not found") ||
    message.includes("Can't reach database server")
  );
}

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const dbError = isDbConnectionError(error.message);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-6 rounded-lg border border-dashed border-red-300 p-8 text-center dark:border-red-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dbError ? "Can't reach the database" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {dbError
            ? "Prisma couldn't connect to Supabase. This usually means the project is paused, or DATABASE_URL / DIRECT_URL in your .env don't match an active Supabase project (check Project Settings > Database)."
            : "An unexpected error occurred while loading this page."}
        </p>
        <button
          onClick={() => retry()}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
