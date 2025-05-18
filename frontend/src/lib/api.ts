import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  withCredentials: false,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
export interface Credential {
  id: string;
  platform: string;
  username: string;
  password: string;
}

export interface CredentialInput {
  platform: string;
  username: string;
  password: string;
}

export interface TaskInput {
  taskType: string;
  taskText: string;
  platform?: string;
}

export interface Task {
  id: string;
  userId: string;
  taskType: string;
  taskText: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    title?: string;
    description?: string;
    insights?: string[];
    actionItems?: string[];
    score?: number;
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// API Functions
export const credentialsApi = {
  getAll: async (): Promise<Credential[]> => {
    const { data } = await api.get('/credentials');
    return data;
  },
  
  create: async (credential: CredentialInput): Promise<Credential> => {
    const { data } = await api.post('/credentials', credential);
    return data;
  },
  
  update: async (id: string, credential: Partial<CredentialInput>): Promise<Credential> => {
    const { data } = await api.put(`/credentials/${id}`, credential);
    return data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/credentials/${id}`);
  },
};

export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const { data } = await api.get('/tasks');
    return data;
  },
  
  getById: async (id: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },
  
  create: async (task: TaskInput): Promise<Task> => {
    const { data } = await api.post('/tasks', task);
    return data;
  },
};