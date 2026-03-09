import { Sidebar } from "@/src/components/layout/sidebar";
import { Header } from "@/src/components/layout/header";
import { MobileNav } from "@/src/components/layout/mobile-nav";
import { FadeIn } from "@/src/components/motion/fade-in";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <FadeIn>{children}</FadeIn>
        </main>
      </div>
    </div>
  );
}
