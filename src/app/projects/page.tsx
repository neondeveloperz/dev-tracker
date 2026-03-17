"use client";

import { useState, useEffect } from "react";
import { 
  FolderPlus, 
  Search, 
  MoreHorizontal, 
  LayoutGrid, 
  List,
  Plus
} from 'lucide-react';
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db, Project } from "@/lib/tauri-db";
import Link from "next/link";
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

export default function ProjectsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects(user.id);
    }
  }, [user]);

  const fetchProjects = async (userId: string) => {
    try {
      const data = await db.getProjects(userId);
      setProjects(data);
    } catch (e) {
      toast.error("Failed to fetch projects");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !user) return;
    setIsCreating(true);
    try {
      await db.createProject(newName, user.id, newDesc);
      toast.success("Project created successfully!");
      setNewName("");
      setNewDesc("");
      fetchProjects(user.id);
    } catch (e) {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Shell>
      <main className="flex-1 flex flex-col h-full">
        <header className="p-8 lg:p-12 pb-4 flex justify-between items-end w-full">
          <div>
            <h1 className="text-4xl font-bold title-gradient mb-2">Projects</h1>
            <p className="text-muted-foreground">Manage and organize your development workspaces.</p>
          </div>
          <Dialog>
            <DialogTrigger 
              render={
                <Button className="bg-blue-600 hover:bg-blue-500 rounded-xl px-6 h-11 shadow-lg shadow-blue-500/20">
                  <FolderPlus size={18} className="mr-2" />
                  New Project
                </Button>
              }
            />
            <DialogContent className="glass border-border text-foreground sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs text-[11px]">
                  Add a new workspace to track your progress and tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Project Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Neon App" 
                    className="bg-muted/50 border-border"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Description</Label>
                  <Input 
                    id="desc" 
                    placeholder="Brief overview of the project" 
                    className="bg-muted/50 border-border"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl w-full h-11"
                >
                  {isCreating ? "Creating..." : "Confirm Creation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="px-8 lg:px-12 py-6 w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-10 bg-muted/50 border-border" />
            </div>
            
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className={view === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground"} 
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={18} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={view === 'table' ? "bg-primary/10 text-primary" : "text-muted-foreground"} 
                onClick={() => setView('table')}
              >
                <List size={18} />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-zinc-500">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
                <p>No projects found. Create one to get started!</p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Link href={`/projects/detail?id=${project.id}`} key={project.id}>
                    <Card className="glass border-border hover:border-primary/50 transition-all group shadow-xl cursor-pointer h-full bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Plus size={20} />
                          </div>
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground capitalize">
                            {project.status}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors uppercase tracking-tight truncate text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">{project.description || "No description"}</p>
                        
                        <div className="flex justify-between items-end pt-4 border-t border-border">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Logged Time</span>
                            <span className="text-lg font-mono text-foreground">{formatHoursToHMS(project.totalHours)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="glass border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Project Name</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Logged Time</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id} className="border-border hover:bg-accent/50 cursor-pointer" onClick={() => window.location.href = `/projects/detail?id=${project.id}`}>
                        <TableCell className="font-semibold text-foreground">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground capitalize">
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-foreground">{formatHoursToHMS(project.totalHours)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={18} />
                          </Button>
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
