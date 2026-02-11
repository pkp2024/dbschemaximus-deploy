'use client';

import { useState } from 'react';
import type { Node } from '@xyflow/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SQLDialect } from '@/types/schema';
import { downloadJSON, downloadSQL, exportToSQL, exportToJSON } from '@/lib/export/exportSchema';
import { exportToPng } from '@/lib/export/exportImage';
import { Download, FileJson, Database, Image as ImageIcon } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  nodes?: Node[];
}

export default function ExportDialog({ isOpen, onClose, projectId, projectName, nodes = [] }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'sql' | 'png'>('sql');
  const [sqlDialect, setSqlDialect] = useState<SQLDialect>(SQLDialect.POSTGRESQL);
  const [preview, setPreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    try {
      if (exportFormat === 'json') {
        const schema = await exportToJSON(projectId);
        setPreview(JSON.stringify(schema, null, 2));
      } else {
        const sql = await exportToSQL(projectId, sqlDialect);
        setPreview(sql);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (exportFormat === 'json') {
        await downloadJSON(projectId, projectName);
      } else if (exportFormat === 'sql') {
        await downloadSQL(projectId, projectName, sqlDialect);
      } else if (exportFormat === 'png') {
        await exportToPng({
          nodes,
          fileName: projectName,
          padding: 50,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download file');
    }
  };

  const handleCopyToClipboard = () => {
    if (preview) {
      navigator.clipboard.writeText(preview);
      alert('Copied to clipboard!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Export Schema</DialogTitle>
          <DialogDescription>
            Export your database schema as JSON or SQL
          </DialogDescription>
        </DialogHeader>

        <Tabs value={exportFormat} onValueChange={(value) => setExportFormat(value as 'json' | 'sql' | 'png')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2">
              <Database className="w-4 h-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="png" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              PNG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <p className="text-sm text-slate-600">
              Export as JSON to backup your schema or import it into another project.
            </p>
          </TabsContent>

          <TabsContent value="sql" className="space-y-4">
            <div className="space-y-2">
              <Label>SQL Dialect</Label>
              <Select value={sqlDialect} onValueChange={(value) => setSqlDialect(value as SQLDialect)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SQLDialect.POSTGRESQL}>PostgreSQL</SelectItem>
                  <SelectItem value={SQLDialect.MYSQL}>MySQL</SelectItem>
                  <SelectItem value={SQLDialect.SQLITE}>SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="png" className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Export your schema diagram as a high-resolution PNG image.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="text-sm text-blue-900 font-medium">
                    ✨ Smart Export Features:
                  </p>
                  <ul className="text-sm text-blue-900 space-y-1 ml-4">
                    <li>• Automatically sizes to fit all tables</li>
                    <li>• Includes all relationships and connections</li>
                    <li>• High resolution (2x pixel ratio)</li>
                    <li>• 50px padding around the diagram</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview Section - Only for JSON and SQL */}
        {exportFormat !== 'png' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePreview}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Preview'}
              </Button>
              {preview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                >
                  Copy to Clipboard
                </Button>
              )}
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
            {!preview ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Click &quot;Generate Preview&quot; to see the export output
              </p>
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap">{preview}</pre>
            )}
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download {exportFormat.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
