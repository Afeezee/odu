import { Header } from "@/components/Header";

// Server layout — renders the Header (which reads the session cookie) so
// the client-side chat page doesn't need to fetch the session itself.
// h-dvh + min-h-0 gives the chat page a fixed viewport so its sidebar and
// message list can each own their own scroll region.
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col">
      <Header />
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
