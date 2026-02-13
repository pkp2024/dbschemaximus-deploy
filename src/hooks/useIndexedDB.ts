import { useState, useEffect, useCallback } from 'react';
import * as dbOps from '@/lib/data/operations';
import type { Project } from '@/types/schema';
import { usePersistenceMode } from '@/hooks/usePersistenceMode';

export function useProjects() {
  const { mode } = usePersistenceMode();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const allProjects = await dbOps.getAllProjects();
      setProjects(allProjects);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects, mode]);

  const createProject = useCallback(async (name: string, description?: string) => {
    const id = await dbOps.createProject({ name, description });
    await loadProjects();
    return id;
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await dbOps.deleteProject(id);
    await loadProjects();
  }, [loadProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    await dbOps.updateProject(id, updates);
    await loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    error,
    createProject,
    deleteProject,
    updateProject,
    refreshProjects: loadProjects,
  };
}

export function useProject(projectId: string | null) {
  const { mode } = usePersistenceMode();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    const loadProject = async () => {
      setIsLoading(true);
      const proj = await dbOps.getProject(projectId);
      setProject(proj || null);
      setIsLoading(false);
    };

    loadProject();
  }, [projectId, mode]);

  return { project, isLoading };
}
