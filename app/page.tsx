import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OuiLogo } from "@/components/OuiLogo";
import { getSession } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getSession();
  const primaryCtaHref = session ? "/chat" : "/sign-up?next=/chat";
  const primaryCtaLabel = session ? "Continue chatting" : "Start Chatting";

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-14 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-oui-navy dark:text-oui-gold/90 mb-4">
              <span className="inline-block w-8 h-px bg-oui-gold" />
              Oduduwa University
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl leading-tight tracking-tight">
              Meet <span className="text-oui-maroon dark:text-oui-gold">Odu</span> — your intelligent guide to OUI.
            </h1>
            <p className="mt-5 text-lg text-oui-muted max-w-xl leading-relaxed">
              Ask about programmes, staff, fees, admission and graduation requirements, examination policies, and university contacts. Odu answers straight from the official OUI Handbook.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-oui-maroon text-white px-6 py-3 font-medium hover:bg-oui-maroon-600 transition-colors shadow-sm"
              >
                {primaryCtaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              {!session && (
                <Link
                  href="/sign-in?next=/chat"
                  className="inline-flex items-center rounded-full border border-oui-border dark:border-oui-border-dark px-6 py-3 font-medium hover:bg-oui-gold/10 transition-colors"
                >
                  I already have an account
                </Link>
              )}
              <a
                href="#capabilities"
                className="inline-flex items-center rounded-full border border-oui-border dark:border-oui-border-dark px-6 py-3 font-medium hover:bg-oui-gold/10 transition-colors"
              >
                What can Odu do?
              </a>
            </div>
            <p className="mt-6 text-sm text-oui-muted max-w-lg">Learning for Human Development.</p>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-oui-gold/20 rounded-full blur-3xl" />
              <div className="relative bg-oui-surface dark:bg-oui-surface-dark rounded-3xl border border-oui-border dark:border-oui-border-dark p-10 shadow-lg">
                <OuiLogo className="h-40 w-40" priority />
              </div>
            </div>
          </div>
        </div>

        <section id="capabilities" className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Programme details",
              body: "Course structures, credit units, and graduation requirements across every college and department.",
            },
            {
              title: "Fees & policies",
              body: "Current fee schedules, examination rules, transfer requirements, and the code of conduct.",
            },
            {
              title: "Staff & contacts",
              body: "Provosts, department heads, and the university's important telephone numbers.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-5"
            >
              <div className="text-sm font-semibold text-oui-maroon dark:text-oui-gold mb-1">{f.title}</div>
              <p className="text-sm text-oui-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
