export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  totalHours: number;
  lastUpdated: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}
