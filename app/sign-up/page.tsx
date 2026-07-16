"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/chat";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          email,
          password,
          adminSecret: adminSecret || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="You'll be signed in and taken straight to the chat."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/sign-in${nextPath !== "/chat" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
            className="text-oui-maroon dark:text-oui-gold hover:underline font-medium"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name (optional)" type="text" autoComplete="name" value={name} onChange={setName} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          hint="At least 8 characters."
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          required
        />

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdmin((v) => !v)}
            className="text-xs text-oui-navy dark:text-oui-gold/80 hover:underline"
          >
            {showAdmin ? "Hide" : "Signing up as an administrator?"}
          </button>
          {showAdmin && (
            <div className="mt-2">
              <Field
                label="Admin secret"
                type="password"
                value={adminSecret}
                onChange={setAdminSecret}
                hint="Provided by your IT contact. Leave blank if you're a regular user."
              />
            </div>
          )}
        </div>

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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

function AuthPageSkeleton() {
  return (
    <AuthShell title="Create your account" subtitle="You'll be signed in and taken straight to the chat.">
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-md bg-oui-border/40 dark:bg-oui-border-dark/40" />
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
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
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
      {hint && <span className="mt-1 block text-xs text-oui-muted">{hint}</span>}
    </label>
  );
}
