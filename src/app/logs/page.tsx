"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { db, TimeSessionWithDetails } from "@/lib/tauri-db";
import { useAuth } from "@/lib/auth-context";
import { Clock, Folder, CheckSquare, Calendar, Search, History, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LogsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TimeSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.id) {
      db.getAllTimeSessions(user.id)
        .then(setSessions)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (isoString: string) => {
    const s = isoString.endsWith("Z") ? isoString : isoString + "Z";
    const date = new Date(s);
    return date.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    const s = isoString.endsWith("Z") ? isoString : isoString + "Z";
    return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDurationParts = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(" ");
  };

  const calculateDuration = (startStr: string, endStr: string) => {
    const s = startStr.endsWith("Z") ? startStr : startStr + "Z";
    const e = endStr.endsWith("Z") ? endStr : endStr + "Z";

    const diffMs = new Date(e).getTime() - new Date(s).getTime();
    if (diffMs < 0) return "0s";
    return formatDurationParts(diffMs);
  };

  const getTotalDuration = () => {
    const totalMs = filteredSessions.reduce((acc, session) => {
      const s = session.startTime.endsWith("Z") ? session.startTime : session.startTime + "Z";
      const e = session.endTime.endsWith("Z") ? session.endTime : session.endTime + "Z";
      const diff = new Date(e).getTime() - new Date(s).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    return formatDurationParts(totalMs);
  };

  const filteredSessions = sessions.filter(session =>
    session.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.taskTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    session.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Shell>
      <main className="flex-1 flex flex-col h-full">
        <header className="p-8 lg:p-12 pb-4 flex justify-between items-end w-full">
          <div>
            <h1 className="text-4xl font-bold title-gradient mb-2">Time Logs</h1>
            <p className="text-muted-foreground font-medium">Review and manage your historical time sessions across all projects.</p>
          </div>

          <div className="flex gap-4">
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 text-sm font-medium border border-border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Timer className="w-4 h-4" />
                </div>
                Total Work: <span className="text-foreground font-mono">{getTotalDuration()}</span>
              </div>
            </div>

            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 text-sm font-medium border border-border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Clock size={16} />
                </div>
                Total Logs: <span className="text-foreground font-mono">{filteredSessions.length}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 lg:px-12 py-6 w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by project, task, or notes..."
                className="pl-10 bg-muted/50 border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-zinc-500">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
                <p>No time logs found.</p>
              </div>
            ) : (
              <Card className="glass border-border overflow-hidden shadow-2xl bg-card/50">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] pl-6">Date</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Context (Project / Task)</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Activity Notes</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Time Range</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-wider text-[10px] pr-6">Investment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id} className="border-border hover:bg-accent/50 group">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar size={14} className="opacity-40" />
                            <span className="text-sm font-medium">{formatDate(session.startTime)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1 max-w-[240px]">
                            <div className="flex items-center gap-2">
                              <Folder size={14} className="text-blue-500" />
                              <span className="text-sm font-bold text-zinc-200 truncate">{session.projectName}</span>
                            </div>
                            {session.taskTitle && (
                              <div className="flex items-center gap-2 opacity-60">
                                <div className="w-4 flex justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                </div>
                                <span className="text-[11px] font-medium text-muted-foreground truncate">{session.taskTitle}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="text-sm text-muted-foreground line-clamp-2 italic">
                            {session.description || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground">{formatTime(session.startTime)}</span>
                            <span className="text-muted-foreground/30">→</span>
                            <span className="text-muted-foreground">{formatTime(session.endTime)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-mono text-[11px] px-2.5">
                            {calculateDuration(session.startTime, session.endTime)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </ScrollArea>
        </div>
      </main>
    </Shell>
  );
}
