import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <AdminNav />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </div>
  );
}
