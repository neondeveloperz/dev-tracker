"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Download,
  Bell,
  ShieldCheck,
  Zap,
  Globe,
  Database
} from "lucide-react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/tauri-db";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleExport = async () => {
    if (!user) return;
    try {
      const data = await invoke<string>("export_data", { userId: user.id });
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devtrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Data backup generated successfully");
    } catch (e) {
      toast.error("Failed to export data");
    }
  };

  return (
    <Shell>
      <main className="flex-1 flex flex-col h-full bg-background p-8 lg:p-12 overflow-y-auto">
        <div className="w-full space-y-12 pb-12">
          {/* Header */}
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
              <SettingsIcon size={14} />
              System Configuration
            </div>
            <h1 className="text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
              Settings <span className="text-muted-foreground/50">Hub</span>
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Manage your focus environment and system preferences.
            </p>
          </header>

          <div className="grid gap-8">
            {/* Appearance */}
            <Card className="glass border-border bg-card/50 overflow-hidden shadow-2xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <Monitor size={20} className="text-blue-500" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-muted-foreground">Customize how the interface looks on your screen.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'dark', label: 'Dark Node', icon: Moon, desc: 'Optimized for focus' },
                    { id: 'light', label: 'Light Node', icon: Sun, desc: 'High visibility' },
                    { id: 'system', label: 'System Sync', icon: Monitor, desc: 'Follow OS settings' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTheme(mode.id)}
                        className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 group ${theme === mode.id
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                          : 'border-border bg-muted/50 hover:border-accent'
                        }`}
                    >
                      <mode.icon size={20} className={theme === mode.id ? 'text-blue-500' : 'text-muted-foreground group-hover:text-foreground'} />
                      <div>
                        <p className={`font-black uppercase text-xs tracking-wider ${theme === mode.id ? 'text-blue-500' : 'text-foreground'}`}>
                          {mode.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">{mode.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Desktop Enhancements */}
            <Card className="glass border-border bg-card/50 overflow-hidden shadow-2xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <Zap size={20} className="text-orange-500" />
                  Desktop Integration
                </CardTitle>
                <CardDescription className="text-muted-foreground">Native OS features and background processes.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/50 border border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-orange-500" />
                      <h4 className="font-bold text-foreground">Focus Reminders</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Notify me every 1 hour to take a break and protect ergonomics.</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/50 border border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-blue-500" />
                      <h4 className="font-bold text-foreground">System Tray Icon</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Show persistent icon in the menu bar for quick timer control.</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase">Active</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="glass border-border bg-card/50 overflow-hidden shadow-2xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <Database size={20} className="text-emerald-500" />
                  Data Security
                </CardTitle>
                <CardDescription className="text-muted-foreground">Protect and export your work investment data.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                      <ShieldCheck size={32} className="text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-foreground text-lg">Local Backup System</h4>
                      <p className="text-sm text-muted-foreground max-w-md">Your data is stored securely in Neon PostgreSQL. You can generate a full JSON export for your own records anytime.</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleExport}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-black rounded-xl h-12 px-8 shadow-xl"
                  >
                    <Download size={18} className="mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Shell>
  );
}
