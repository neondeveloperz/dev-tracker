import { invoke } from "@tauri-apps/api/core";
import { User } from "./auth-context";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalHours: number;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: string;
  projectId: string;
  totalHours: number;
}

export interface TimeSession {
  id: string;
  startTime: string; // ISO 8601 string from Rust (chrono)
  endTime: string;
  description: string;
  taskId: string | null;
  projectId: string;
}

export interface TimeSessionWithDetails {
  id: string;
  startTime: string; // ISO 8601 string from Rust (chrono)
  endTime: string;
  description: string;
  projectName: string;
  taskTitle: string | null;
}

export const db = {
  // --- Config & Connection ---
  getDbStatus: async (): Promise<boolean> => {
    return await invoke("get_db_status");
  },

  connectDb: async (url: string): Promise<void> => {
    return await invoke("connect_db", { url });
  },

  // --- Auth ---
  registerUser: async (email: string, password: string, name?: string): Promise<User> => {
    return await invoke("register_user", { email, password, name });
  },

  loginUser: async (email: string, password: string): Promise<User> => {
    return await invoke("login_user", { email, password });
  },

  // --- Projects ---
  getProjects: async (userId: string): Promise<Project[]> => {
    return await invoke("get_projects", { userId });
  },

  getProject: async (id: string): Promise<Project> => {
    return await invoke("get_project", { id });
  },

  createProject: async (name: string, userId: string, description?: string): Promise<Project> => {
    return await invoke("create_project", { name, description, userId });
  },

  addProjectTime: async (projectId: string, hours: number): Promise<Project> => {
    return await invoke("add_project_time", { projectId, hours });
  },

  getTasks: async (projectId: string): Promise<Task[]> => {
    return await invoke("get_tasks", { projectId });
  },

  createTask: async (projectId: string, title: string, priority: string = "medium"): Promise<Task> => {
    return await invoke("create_task", { projectId, title, priority });
  },

  addTaskTime: async (taskId: string, projectId: string, hours: number): Promise<Task> => {
    return await invoke("add_task_time", { taskId, projectId, hours });
  },

  updateTask: async (taskId: string, title: string, priority: string, isCompleted: boolean): Promise<Task> => {
    return await invoke("update_task", { taskId, title, priority, isCompleted });
  },

  deleteTask: async (taskId: string): Promise<void> => {
    return await invoke("delete_task", { taskId });
  },

  addTimeSession: async (projectId: string, taskId: string | null, startTime: string, endTime: string, description: string): Promise<TimeSession> => {
    return await invoke("add_time_session", { projectId, taskId, startTime, endTime, description });
  },

  getTimeSessions: async (projectId: string): Promise<TimeSession[]> => {
    return await invoke("get_time_sessions", { projectId });
  },

  getAllTimeSessions: async (userId: string): Promise<TimeSessionWithDetails[]> => {
    return await invoke("get_all_time_sessions", { userId });
  },
};
