"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  MoreVertical
} from 'lucide-react';
import { Shell } from "@/components/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { db, Task, Project, TimeSession } from "@/lib/tauri-db";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("medium");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchTasks();
      fetchTimeSessions();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      const data = await db.getProject(projectId);
      setProject(data);
    } catch (e) {
      toast.error("Failed to load project details");
    }
  };

  const fetchTasks = async () => {
    if (!projectId) return;
    try {
      const data = await db.getTasks(projectId);
      setTasks(data);
    } catch (e) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSessions = async () => {
    if (!projectId) return;
    try {
      const data = await db.getTimeSessions(projectId);
      setTimeSessions(data);
    } catch (e) {
      console.error("Failed to load time sessions", e);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle || !projectId) return;
    setIsAdding(true);
    try {
      await db.createTask(projectId, newTaskTitle);
      toast.success("Task added");
      setNewTaskTitle("");
      fetchTasks();
    } catch (e) {
      toast.error("Failed to add task");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      await db.updateTask(task.id, task.title, task.priority, !task.isCompleted);
      fetchTasks();
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (activeTaskId === taskId) {
        if (isTimerRunning) await toggleTimer();
        setActiveTaskId(null);
      }
      await db.deleteTask(taskId);
      toast.success("Task deleted");
      fetchTasks();
    } catch (e) {
      toast.error("Failed to delete task");
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskPriority(task.priority);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTaskTitle) return;
    setIsUpdating(true);
    try {
      await db.updateTask(editingTask.id, editTaskTitle, editTaskPriority, editingTask.isCompleted);
      toast.success("Task updated");
      setIsEditDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (e) {
      toast.error("Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = async () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      if (sessionSeconds > 0 && projectId && activeTaskId && sessionStartTime) {
        const hoursToAdd = sessionSeconds / 3600;
        const endTimeStr = new Date().toISOString();
        const taskDescription = tasks.find(t => t.id === activeTaskId)?.title || "Unknown Task";
        try {
          // Log time to the specific task
          await db.addTaskTime(activeTaskId, projectId, hoursToAdd);
          // Add detailed time session log
          await db.addTimeSession(projectId, activeTaskId, sessionStartTime, endTimeStr, taskDescription);
          
          toast.success(`Logged ${formatTime(sessionSeconds)} to task`);
          setSessionSeconds(0);
          setSessionStartTime(null);
          // Refresh data
          fetchProjectData();
          fetchTasks();
          fetchTimeSessions();
        } catch (e: any) {
          toast.error(`Failed to save tracked time: ${e.message || e}`);
        }
      } else {
        setSessionSeconds(0);
        setSessionStartTime(null);
      }
      setActiveTaskId(null);
    } else {
      if (!activeTaskId) {
        toast.error("Please select a task to track time against");
        return;
      }
      setIsTimerRunning(true);
      setSessionStartTime(new Date().toISOString());
    }
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-zinc-500 flex-col gap-4">
        <div>No project ID provided.</div>
        <Link 
          href="/projects" 
          className={buttonVariants({ variant: "outline", className: "text-white" })}
        >
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="p-8 lg:p-12 pb-6 border-b border-white/5 w-full">
        <Link 
          href="/projects" 
          className={buttonVariants({ variant: "ghost", className: "mb-6 -ml-4 text-zinc-500 hover:text-white gap-2" })}
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold title-gradient uppercase tracking-tighter truncate max-w-2xl">Viewing Project</h1>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">Active</Badge>
            </div>
            <p className="text-zinc-500 max-w-2xl">
              Managing tasks and progress for project ID: <span className="text-zinc-400 font-mono">{projectId}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">{project ? formatHoursToHMS(project.totalHours) : '0s'}</div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-1">Total Time Invested</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full divide-x divide-white/5">
          {/* Tasks List */}
          <div className="lg:col-span-2 flex flex-col min-w-0">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Tasks
                <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10">{tasks.length}</Badge>
              </h2>

              <Dialog>
                <DialogTrigger 
                  render={
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-8 px-3">
                      <Plus size={14} className="mr-1" />
                      Add Task
                    </Button>
                  }
                />
                <DialogContent className="glass border-white/10 text-white sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Task</DialogTitle>
                    <DialogDescription className="text-zinc-500 text-xs text-[11px]">
                      What needs to be done next?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="task-title" className="text-zinc-400 text-[10px] uppercase font-bold mb-2 block">Task Title</Label>
                    <Input
                      id="task-title"
                      placeholder="e.g. Implement login logic"
                      className="bg-white/5 border-white/10"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-500 h-11 rounded-xl"
                      onClick={handleAddTask}
                      disabled={isAdding}
                    >
                      {isAdding ? "Adding..." : "Confirm Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-12 text-center text-zinc-500">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">No tasks found. Click "Add Task" to create one.</div>
              ) : (
                <div className="p-6 space-y-3">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`glass p-4 rounded-xl flex items-center justify-between group transition-all border ${activeTaskId === task.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:bg-white/[0.04] cursor-pointer'}`}
                      onClick={() => !isTimerRunning && setActiveTaskId(task.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}>
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={`${task.isCompleted ? 'line-through text-zinc-600' : 'text-zinc-200'} font-medium`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 h-4 border-white/5 ${task.priority === 'high' ? 'text-red-400 bg-red-400/5' :
                              task.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/5' :
                                'text-zinc-500 bg-white/5'
                              }`}>
                              {task.priority}
                            </Badge>
                            {task.totalHours > 0 && (
                              <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                                <Clock size={10} />
                                {formatHoursToHMS(task.totalHours)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger className="text-zinc-600 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors outline-none focus:outline-none flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10 text-white min-w-32 bg-zinc-950/90 backdrop-blur-xl">
                          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer text-xs" onClick={(e) => { e.stopPropagation(); openEditDialog(task); }}>
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer text-xs" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Edit Task Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="glass border-white/10 text-white sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label htmlFor="edit-task-title" className="text-zinc-400 text-[10px] uppercase font-bold mb-2 block">Task Title</Label>
                    <Input
                      id="edit-task-title"
                      className="bg-white/5 border-white/10"
                      value={editTaskTitle}
                      onChange={(e) => setEditTaskTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold mb-2 block">Priority</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className={`flex-1 text-xs ${editTaskPriority === 'low' ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5 text-zinc-500'}`}
                        onClick={() => setEditTaskPriority('low')}
                      >
                        Low
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className={`flex-1 text-xs ${editTaskPriority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-transparent border-white/5 text-zinc-500'}`}
                        onClick={() => setEditTaskPriority('medium')}
                      >
                        Med
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className={`flex-1 text-xs ${editTaskPriority === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-transparent border-white/5 text-zinc-500'}`}
                        onClick={() => setEditTaskPriority('high')}
                      >
                        High
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 h-11 rounded-xl"
                    onClick={handleUpdateTask}
                    disabled={isUpdating || !editTaskTitle}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sidebar / Stats */}
          <div className="p-8 space-y-8 bg-black/5">
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Task Completion</span>
                  <span className="text-emerald-400 font-mono">
                    {tasks.length > 0 ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.isCompleted).length / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Focus</h3>
              
              {!activeTask && !isTimerRunning ? (
                <div className="glass border-white/5 border border-dashed rounded-xl p-6 text-center text-zinc-500 text-sm">
                  Click on a task from the list to start tracking time.
                </div>
              ) : (
                <Card className="glass border-white/5 shadow-none bg-blue-600/5 transition-all">
                  <CardContent className="p-5 flex flex-col items-center gap-4">
                    <div className="w-full text-center px-2">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 truncate">
                        {activeTask?.title || "Unknown Task"}
                      </p>
                    </div>
                    
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isTimerRunning ? 'bg-blue-600 animate-pulse shadow-lg shadow-blue-500/50' : 'bg-white/10 text-zinc-500'}`}>
                      <Clock size={28} className={isTimerRunning ? 'text-white' : ''} />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">
                        {isTimerRunning ? 'Session Active' : 'Ready to Focus'}
                      </p>
                      <p className={`text-4xl font-mono tracking-tight font-light ${isTimerRunning ? 'text-blue-400 drop-shadow-md' : 'text-zinc-500'}`}>
                        {formatTime(sessionSeconds)}
                      </p>
                    </div>
                    <Button 
                      className={`w-full mt-2 h-11 transition-all rounded-xl ${isTimerRunning ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
                      onClick={toggleTimer}
                    >
                      {isTimerRunning ? 'Stop & Save' : 'Start Timer'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Time Logs</h3>
              <ScrollArea className="h-48 rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="space-y-4">
                  {timeSessions.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-4">No recent activity.</p>
                  ) : (
                    timeSessions.map((session) => {
                      const startStr = session.startTime.endsWith('Z') ? session.startTime : session.startTime + 'Z';
                      const endStr = session.endTime.endsWith('Z') ? session.endTime : session.endTime + 'Z';
                      const start = new Date(startStr);
                      const end = new Date(endStr);
                      const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      
                      return (
                        <div key={session.id} className="flex gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-zinc-300 font-medium">{dateStr}</p>
                            <p className="text-zinc-400 font-medium">{timeStr}</p>
                            <p className="text-zinc-500">{session.description}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full text-zinc-500">Loading details...</div>}>
        <ProjectDetailContent />
      </Suspense>
    </Shell>
  );
}
