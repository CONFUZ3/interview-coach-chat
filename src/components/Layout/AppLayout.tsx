
import React, { useState } from "react";
import {
  SidebarProvider, 
  Sidebar, 
  SidebarContent,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import SidebarNav from "./SidebarNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b">
            <div className="flex h-14 items-center px-4">
              <h1 className="text-lg font-semibold">Career Coach AI</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="border-t py-2">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Career Coach AI</span>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px]">
            <SidebarTrigger />
            <div className="w-full">
              <h2 className="text-lg font-semibold">Career AI Platform</h2>
            </div>
          </div>
          <main>{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
