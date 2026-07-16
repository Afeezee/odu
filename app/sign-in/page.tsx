"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/chat";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // Refresh so middleware picks up the new cookie for the destination.
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to chat with Odu."
      footer={
        <>
          New here?{" "}
          <Link
            href={`/sign-up${nextPath !== "/chat" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
            className="text-oui-maroon dark:text-oui-gold hover:underline font-medium"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-oui-maroon text-white py-2.5 font-medium hover:bg-oui-maroon-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

function AuthPageSkeleton() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to chat with Odu.">
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-md bg-oui-border/40 dark:bg-oui-border-dark/40" />
        <div className="h-16 animate-pulse rounded-md bg-oui-border/40 dark:bg-oui-border-dark/40" />
        <div className="h-10 animate-pulse rounded-full bg-oui-border/40 dark:bg-oui-border-dark/40" />
      </div>
    </AuthShell>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 block w-full rounded-md border border-oui-border dark:border-oui-border-dark bg-oui-bg dark:bg-oui-bg-dark px-3 py-2 outline-none focus:border-oui-gold"
      />
    </label>
  );
}
