import { OuiLogo } from "./OuiLogo";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex flex-col items-center gap-3 mb-6">
          <OuiLogo className="h-14 w-14" priority />
          <div className="text-center leading-tight">
            <div className="font-serif text-xl tracking-tight">
              Odu <span className="text-oui-muted text-sm">— OUI Intelligent Assistant</span>
            </div>
          </div>
        </Link>
        <div className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark shadow-sm p-6 sm:p-8">
          <h1 className="font-serif text-2xl mb-1">{title}</h1>
          <p className="text-sm text-oui-muted mb-6">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-oui-muted">{footer}</div>}
      </div>
    </div>
  );
}
