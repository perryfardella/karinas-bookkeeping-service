import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="md:pl-64 flex-1 flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-end px-4">
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

