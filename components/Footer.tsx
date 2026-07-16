export function Footer() {
  return (
    <footer className="border-t border-oui-border dark:border-oui-border-dark mt-auto">
      <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-oui-muted flex flex-col sm:flex-row gap-1.5 justify-between">
        <div>
          Powered by <span className="font-semibold text-oui-maroon dark:text-oui-gold">Odu — OUI Intelligent Assistant</span>
        </div>
        <div className="max-w-md sm:text-right">
          Answers are AI-generated. For high-stakes decisions (fees, deadlines, admission requirements) please confirm with the relevant OUI office.
        </div>
      </div>
    </footer>
  );
}
