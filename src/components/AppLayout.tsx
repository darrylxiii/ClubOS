import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        <header className="h-14 border-b flex items-center justify-end px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <NotificationBell />
        </header>
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
