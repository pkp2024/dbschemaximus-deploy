'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import { importFromJSON, validateSchemaExport } from '@/lib/export/importSchema';
import { useSchemaStore } from '@/lib/store/schemaStore';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ImportDialog({ isOpen, onClose, projectId }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { loadProject } = useSchemaStore();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    try {
      const text = await file.text();
      const data = validateSchemaExport(JSON.parse(text.replace(/^\uFEFF/, '').trim()));

      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setIsImporting(true);
    setError(null);

    try {
      const text = await selectedFile.text();
      await importFromJSON(text, projectId);

      // Reload the project to show imported data
      await loadProject(projectId);

      // Close dialog and reset
      onClose();
      setSelectedFile(null);
      setPreviewData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import schema');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Schema from JSON</DialogTitle>
          <DialogDescription>
            Import tables, columns, and relationships from a JSON file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select JSON File</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!selectedFile ? (
                <div className="space-y-3">
                  <FileJson className="w-12 h-12 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-sm text-slate-600 mb-2">
                      Drop a JSON file here or click to browse
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileJson className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Import Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">Preview</h4>
              <div className="space-y-1 text-sm text-green-800">
                <p>• Tables: {previewData.tables?.length || 0}</p>
                <p>• Columns: {previewData.columns?.length || 0}</p>
                <p>• Relationships: {previewData.relationships?.length || 0}</p>
              </div>
            </div>
          )}

          {/* JSON Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Expected JSON Format</h4>
            <div className="text-xs text-blue-800 space-y-2">
              <p>The JSON file should contain:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><code className="bg-blue-100 px-1 rounded">project</code> - Project metadata</li>
                <li><code className="bg-blue-100 px-1 rounded">tables</code> - Array of table definitions</li>
                <li><code className="bg-blue-100 px-1 rounded">columns</code> - Array of column definitions</li>
                <li><code className="bg-blue-100 px-1 rounded">relationships</code> - Array of foreign keys</li>
              </ul>
              <p className="mt-2">
                💡 You can export a schema as JSON to see the correct format
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!previewData || isImporting || !!error}
          >
            {isImporting ? 'Importing...' : 'Import Schema'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
