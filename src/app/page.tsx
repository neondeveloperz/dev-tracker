"use client";

import { useState, useEffect } from "react";
import {
  Code2,
  Plus,
  ChevronRight,
  Zap,
  CheckCircle2,
  Timer,
  LayoutDashboard,
  ArrowUpRight,
  Activity,
  Box,
  Layout,
  Clock
} from 'lucide-react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shell } from "@/components/shell";
import { db, Project } from "@/lib/tauri-db";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const formatHoursToHMS = (hours: number) => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
};

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHours: 0,
    activeProjects: 0,
    totalSessions: 0
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData(user.id);
    }
  }, [user]);

  const fetchDashboardData = async (userId: string) => {
    try {
      const projectsData = await db.getProjects(userId);
      setProjects(projectsData.slice(0, 4));

      const logData = await db.getAllTimeSessions(userId);

      const totalHours = projectsData.reduce((acc, p) => acc + p.totalHours, 0);
      setStats({
        totalHours,
        activeProjects: projectsData.filter(p => p.status === 'active').length,
        totalSessions: logData.length
      });
    } catch (e) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <main className="flex-1 flex flex-col h-full bg-background p-8 lg:p-12 overflow-hidden">
        <ScrollArea className="h-full pr-4 -mr-4">
          <div className="space-y-12 pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                  <Activity size={14} />
                  Live Dashboard
                </div>
                <h1 className="text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
                  Developer <span className="text-primary/40">Insights</span>
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  Welcome, <span className="text-foreground">{user?.name || user?.email?.split('@')[0]}</span>. System status is nominal.
                </p>
              </div>
              <Link 
                href="/projects" 
                className={buttonVariants({ 
                  variant: "default", 
                  className: "bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-8 h-14 shadow-2xl shadow-blue-500/20 font-bold group" 
                })}
              >
                <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
                New Project
              </Link>
            </header>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass border-border bg-card/50 overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                <CardContent className="p-8 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Timer size={80} className="text-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1 relative z-10 text-left">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Focus Investment</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-foreground">{formatHoursToHMS(stats.totalHours)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1">
                      <span className="text-emerald-500">↑ 12%</span> from last week
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-border bg-card/50 overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                <CardContent className="p-8 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Box size={80} className="text-purple-500" />
                  </div>
                  <div className="flex flex-col gap-1 relative z-10 text-left">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Active Nodes</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{stats.activeProjects}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 font-medium">Workspaces operational</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-border bg-card/50 overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                <CardContent className="p-8 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={80} className="text-orange-500" />
                  </div>
                  <div className="flex flex-col gap-1 relative z-10 text-left">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Session Depth</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{stats.totalSessions}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 font-medium italic">Verified log entries</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section: Recent + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                    <Layout size={24} className="text-primary" />
                    Recent Workspaces
                  </h2>
                  <Link href="/projects" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.1em]">
                    Directory
                  </Link>
                </div>

                <div className="grid gap-4">
                  {loading ? (
                    <div className="p-12 text-center text-zinc-700 font-mono text-sm animate-pulse">Scanning DB nodes...</div>
                  ) : projects.length === 0 ? (
                    <div className="glass p-16 text-center text-zinc-600 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                      <Box size={40} className="opacity-20" />
                      <p className="font-bold text-zinc-500">No active nodes detected.</p>
                      <Link href="/projects">
                        <Button variant="outline" className="text-xs h-8 border-white/10 px-6">Initialize Project</Button>
                      </Link>
                    </div>
                  ) : projects.map((project) => (
                    <Link href={`/projects/detail?id=${project.id}`} key={project.id}>
                      <div className="glass p-6 rounded-[1.5rem] flex items-center justify-between group hover:bg-accent/50 transition-all duration-300 cursor-pointer border border-border hover:border-primary/50 shadow-xl">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-muted border border-border group-hover:border-primary/50 transition-colors">
                            <Code2 size={24} className="text-primary group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <h4 className="font-black text-foreground text-lg group-hover:text-primary transition-colors uppercase tracking-tight">{project.name}</h4>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-muted border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                {project.status}
                              </Badge>
                              <span className="text-[10px] text-primary/60 font-mono">{formatHoursToHMS(project.totalHours)} logged</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-blue-600/20 transition-all">
                            <ArrowUpRight size={20} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                  <Zap size={24} className="text-orange-500" />
                  Quick Access
                </h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'View Time Logs', icon: Clock, href: '/logs', color: 'text-blue-500' },
                    { label: 'System Settings', icon: Activity, href: '/settings', color: 'text-purple-500' },
                  ].map((item, id) => (
                    <Link key={id} href={item.href}>
                      <Button variant="ghost" className="w-full justify-between h-16 rounded-2xl px-6 bg-muted/50 border border-border hover:bg-accent hover:border-primary/50 group">
                        <div className="flex items-center gap-4">
                          <item.icon size={20} className={item.color} />
                          <span className="font-bold text-muted-foreground group-hover:text-foreground">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-foreground" />
                      </Button>
                    </Link>
                  ))}
                </div>

                <Card className="glass border-blue-500/20 bg-blue-500/[0.03] rounded-3xl overflow-hidden mt-4">
                  <CardContent className="p-6 flex flex-col gap-4 text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Zap size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-white uppercase tracking-tight">Pro Tip</h4>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Use the project timer to accurately track every second of your focus session.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>
    </Shell>
  );
}
