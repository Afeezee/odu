import Link from "next/link";
import { OuiLogo } from "./OuiLogo";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { getSession } from "@/lib/auth";

// Server component — reads the session cookie on the server so there's no
// flicker between anonymous and signed-in states.
export async function Header() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-10 border-b border-oui-border dark:border-oui-border-dark bg-oui-bg/85 dark:bg-oui-bg-dark/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <OuiLogo className="h-8 w-8" priority />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Odu</div>
            <div className="text-[11px] text-oui-navy dark:text-oui-gold/80 uppercase tracking-wider">
              OUI Intelligent Assistant
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/chat"
            className="text-sm px-3 py-1.5 rounded-md hover:bg-oui-gold/10 transition-colors"
          >
            Chat
          </Link>
          {session?.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm px-3 py-1.5 rounded-md hover:bg-oui-gold/10 transition-colors"
            >
              Admin
            </Link>
          )}
          {session ? (
            <>
              <span
                className="hidden sm:inline text-xs text-oui-muted px-2"
                title={session.email}
              >
                {session.name || session.email}
                {session.role === "admin" && (
                  <span className="ml-1 rounded-full bg-oui-gold/20 text-oui-maroon dark:text-oui-gold px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    admin
                  </span>
                )}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-oui-gold/10 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm px-3 py-1.5 rounded-md bg-oui-maroon text-white hover:bg-oui-maroon-600 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
