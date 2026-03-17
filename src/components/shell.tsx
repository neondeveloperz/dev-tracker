"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Code2, 
  Clock, 
  Settings, 
  User,
  Zap,
  Globe,
  Database,
  Terminal
} from 'lucide-react';
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/" },
    { name: "Active Projects", icon: Zap, href: "/projects" },
    { name: "Time Log", icon: Clock, href: "/logs" },
    { name: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-6 flex flex-col gap-8 bg-card/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Code2 size={18} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">Dev<span className="text-primary">Track</span></span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[inset_0px_0px_12px_rgba(var(--primary),0.05)] border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto glass p-4 rounded-2xl flex items-center justify-between border border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <User size={20} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{user?.name || user?.email || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email || "No Email"}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive px-2 ml-2">
            Logout
          </Button>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t border-border bg-card/80 flex items-center justify-between px-4 shrink-0 z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Online</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Database size={10} />
              <span className="text-[10px] font-medium tracking-tight">Neon PostgreSQL</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Globe size={10} />
              <span className="text-[10px] font-medium tracking-tight">Tauri RPC v1.0.0</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 text-muted-foreground border-x border-border px-4 h-full">
                <Terminal size={10} />
                <span className="text-[9px] font-mono leading-none">DEBUG_MODE: ENABLED</span>
             </div>
             <div className="flex items-center gap-2 text-muted-foreground pr-2">
                <Clock size={10} />
                <span className="text-[10px] font-mono tracking-tight">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
