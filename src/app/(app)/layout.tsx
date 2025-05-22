
import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow p-4 sm:p-6 md:p-8">
            {children}
          </main>
          <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t">
            © {new Date().getFullYear()} Qapla' Fitness. All rights reserved. Klingon word "Qapla'" means success.
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
