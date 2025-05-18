import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Task, TaskInput, tasksApi } from '@/lib/api';

export function useTasks() {
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll,
  });
  
  const createTask = useMutation({
    mutationFn: (newTask: TaskInput) => tasksApi.create(newTask),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return data;
    },
  });
  
  return {
    tasks,
    isLoading,
    error,
    createTask,
  };
}

export function useTask(id: string) {
  const queryClient = useQueryClient();
  
  const { 
    data: task, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
    refetchInterval: (data) => {
      // Poll every 3 seconds until task is completed or failed
      if (!data) return 3000;
      return data.status !== 'completed' && data.status !== 'failed' ? 3000 : false;
    },
  });
  
  return {
    task,
    isLoading,
    error,
    refetch,
  };
}