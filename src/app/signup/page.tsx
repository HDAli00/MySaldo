import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Create your Saldo account</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Privacy-first personal finance for ING Netherlands transactions.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
