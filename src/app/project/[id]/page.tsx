'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { useSchemaStore } from '@/lib/store/schemaStore';
import { useProject } from '@/hooks/useIndexedDB';
import { useTables } from '@/hooks/useSchema';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Download, Upload } from 'lucide-react';
import SchemaCanvas from '@/components/canvas/SchemaCanvas';
import TableEditor from '@/components/table/TableEditor';
import ExportDialogWrapper from '@/components/dialogs/ExportDialogWrapper';
import ImportDialog from '@/components/dialogs/ImportDialog';
import PropertiesPanel from '@/components/sidebar/PropertiesPanel';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { project, isLoading: isProjectLoading } = useProject(projectId);
  const { loadProject, clearProject, deleteTable, isLoading: isSchemaLoading } = useSchemaStore();
  const tables = useTables();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId && !isInitialized) {
      loadProject(projectId);
      setIsInitialized(true);
    }

    return () => {
      clearProject();
    };
  }, [projectId, loadProject, clearProject, isInitialized]);

  const handleAddTable = () => {
    setEditingTableId(null);
    setIsTableEditorOpen(true);
  };

  const handleEditTable = (tableId: string) => {
    setEditingTableId(tableId);
    setIsTableEditorOpen(true);
  };

  const handleDeleteTable = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table && confirm(`Delete table "${table.name}"? This will also delete all its columns and relationships.`)) {
      await deleteTable(tableId);
    }
  };

  const handleCloseEditor = () => {
    setIsTableEditorOpen(false);
    setEditingTableId(null);
  };

  if (isProjectLoading || isSchemaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-lg text-slate-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Project Not Found</h2>
          <p className="text-slate-600 mb-6">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-slate-500">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handleAddTable}>
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Main Content - Canvas + Properties Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ReactFlowProvider>
            <SchemaCanvas
              projectId={projectId}
              onTableEdit={handleEditTable}
              onTableDelete={handleDeleteTable}
            />

            {/* Export Dialog - inside ReactFlowProvider to access nodes */}
            <ExportDialogWrapper
              isOpen={isExportDialogOpen}
              onClose={() => setIsExportDialogOpen(false)}
              projectId={projectId}
              projectName={project?.name || 'schema'}
            />
          </ReactFlowProvider>
        </div>
        <PropertiesPanel />
      </div>

      {/* Table Editor Dialog */}
      <TableEditor
        isOpen={isTableEditorOpen}
        onClose={handleCloseEditor}
        projectId={projectId}
        tableId={editingTableId}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}
