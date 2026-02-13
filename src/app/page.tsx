'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/useIndexedDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Database, Trash2, Calendar } from 'lucide-react';
import PersistenceModeToggle from '@/components/persistence/PersistenceModeToggle';

export default function HomePage() {
  const router = useRouter();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const id = await createProject(newProjectName, newProjectDescription);
    setIsCreateDialogOpen(false);
    setNewProjectName('');
    setNewProjectDescription('');
    router.push(`/project/${id}`);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await deleteProject(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-slate-900">DrawSQL Clone</h1>
            </div>
            <PersistenceModeToggle />
          </div>
          <p className="text-lg text-slate-600">
            Design and visualize database schemas with an intuitive drag-and-drop interface
          </p>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Your Projects</h2>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-slate-600">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-600 mb-2">No projects yet</p>
                <p className="text-sm text-slate-500 mb-6">Create your first database schema project to get started</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Project Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Start designing your database schema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My Database Schema"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="A brief description of your project"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
