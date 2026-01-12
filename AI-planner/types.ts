export enum TaskType {
  TODO = 'TODO',
  CALL = 'CALL',
  MEETING = 'MEETING',
  EMAIL = 'EMAIL',
  NOTE = 'NOTE'
}

export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  data: string; // Base64 string
}

export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  deadline: string | null; // ISO string format
  estimatedDuration?: string; // e.g. "30 min", "1h"
  isCompleted: boolean;
  completedAt?: string; // ISO string when task was completed
  isDeleted?: boolean;
  isFocus?: boolean; // "Dagens fokus"
  priority: Priority;
  createdAt: string; // ISO string format
  tags?: string[]; // Companies, People names, etc.
  attachments?: Attachment[];
  checklist?: Subtask[]; // Auto-generated steps
}

export interface GeminiParsedTask {
  title: string;
  description: string;
  type: string; // Will be mapped to TaskType
  deadline: string | null;
  priority: string; // Will be mapped to Priority
  tags?: string[];
  checklist?: string[]; // Array of strings from AI, converted to Subtasks in App
  estimatedDuration?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  username: string;
  password: string; // Simple local storage password
  role: UserRole;
}