'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchemaStore } from '@/lib/store/schemaStore';
import { useTable, useColumns } from '@/hooks/useSchema';
import { DataType, getRandomTableColor } from '@/types/schema';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  tableId?: string | null;
}

interface ColumnForm {
  id?: string;
  name: string;
  dataType: DataType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
}

const DATA_TYPES = Object.values(DataType);

export default function TableEditor({ isOpen, onClose, projectId, tableId }: TableEditorProps) {
  const table = useTable(tableId || null);
  const existingColumns = useColumns(tableId || null);
  const { addTable, updateTable, addColumn, updateColumn, deleteColumn } = useSchemaStore();

  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [tableColor, setTableColor] = useState(getRandomTableColor());
  const [columns, setColumns] = useState<ColumnForm[]>([]);

  // Load existing data when editing
  useEffect(() => {
    if (tableId && table) {
      setTableName(table.name);
      setTableDescription(table.description || '');
      setTableColor(table.color || getRandomTableColor());
      setColumns(
        existingColumns.map((col) => ({
          id: col.id,
          name: col.name,
          dataType: col.dataType,
          length: col.length,
          precision: col.precision,
          scale: col.scale,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isUnique: col.isUnique,
          isAutoIncrement: col.isAutoIncrement,
          defaultValue: col.defaultValue,
        }))
      );
    } else {
      // Reset for new table
      setTableName('');
      setTableDescription('');
      setTableColor(getRandomTableColor());
      setColumns([]);
    }
  }, [tableId, table, existingColumns]);

  const addNewColumn = () => {
    setColumns([
      ...columns,
      {
        name: '',
        dataType: DataType.VARCHAR,
        length: 255,
        nullable: true,
        isPrimaryKey: false,
        isUnique: false,
        isAutoIncrement: false,
      },
    ]);
  };

  const updateColumnField = (index: number, field: keyof ColumnForm, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };

    // Auto-adjust constraints
    if (field === 'isPrimaryKey' && value) {
      newColumns[index].nullable = false;
    }

    setColumns(newColumns);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!tableName.trim()) {
      alert('Table name is required');
      return;
    }

    try {
      let finalTableId = tableId;

      // Create or update table
      if (tableId) {
        await updateTable(tableId, {
          name: tableName,
          description: tableDescription,
          color: tableColor,
        });
      } else {
        finalTableId = await addTable({
          projectId,
          name: tableName,
          description: tableDescription,
          position: { x: 100, y: 100 },
          color: tableColor,
        });
      }

      if (!finalTableId) return;

      // Handle columns
      const existingColumnIds = new Set(existingColumns.map((c) => c.id));
      const currentColumnIds = new Set(columns.filter((c) => c.id).map((c) => c.id!));

      // Delete removed columns
      for (const existingCol of existingColumns) {
        if (!currentColumnIds.has(existingCol.id)) {
          await deleteColumn(existingCol.id);
        }
      }

      // Add or update columns
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (!col.name.trim()) continue;

        const columnData = {
          tableId: finalTableId,
          name: col.name,
          dataType: col.dataType,
          length: col.length,
          precision: col.precision,
          scale: col.scale,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isUnique: col.isUnique,
          isAutoIncrement: col.isAutoIncrement,
          defaultValue: col.defaultValue,
          orderIndex: i,
        };

        if (col.id && existingColumnIds.has(col.id)) {
          await updateColumn(col.id, columnData);
        } else {
          await addColumn(columnData);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving table:', error);
      alert(error instanceof Error ? error.message : 'Failed to save table');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tableId ? 'Edit Table' : 'Create Table'}</DialogTitle>
          <DialogDescription>
            {tableId ? 'Update table properties and columns' : 'Define your table structure'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="columns">Columns ({columns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name *</Label>
              <Input
                id="tableName"
                placeholder="users"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableDescription">Description</Label>
              <Input
                id="tableDescription"
                placeholder="User accounts and profiles"
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'].map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2"
                      style={{
                        backgroundColor: color,
                        borderColor: tableColor === color ? '#000' : 'transparent',
                      }}
                      onClick={() => setTableColor(color)}
                    />
                  )
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="columns" className="space-y-4">
            <div className="space-y-3">
              {columns.map((column, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-slate-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Column Name *</Label>
                        <Input
                          placeholder="id"
                          value={column.name}
                          onChange={(e) => updateColumnField(index, 'name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data Type *</Label>
                        <Select
                          value={column.dataType}
                          onValueChange={(value) => updateColumnField(index, 'dataType', value as DataType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DATA_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(column.dataType === DataType.VARCHAR || column.dataType === DataType.CHAR) && (
                        <div className="space-y-2">
                          <Label>Length</Label>
                          <Input
                            type="number"
                            value={column.length || ''}
                            onChange={(e) => updateColumnField(index, 'length', parseInt(e.target.value) || undefined)}
                          />
                        </div>
                      )}

                      {(column.dataType === DataType.DECIMAL || column.dataType === DataType.NUMERIC) && (
                        <>
                          <div className="space-y-2">
                            <Label>Precision</Label>
                            <Input
                              type="number"
                              value={column.precision || ''}
                              onChange={(e) =>
                                updateColumnField(index, 'precision', parseInt(e.target.value) || undefined)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Scale</Label>
                            <Input
                              type="number"
                              value={column.scale || ''}
                              onChange={(e) => updateColumnField(index, 'scale', parseInt(e.target.value) || undefined)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeColumn(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-4 ml-8">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`pk-${index}`}
                        checked={column.isPrimaryKey}
                        onCheckedChange={(checked) => updateColumnField(index, 'isPrimaryKey', checked)}
                      />
                      <Label htmlFor={`pk-${index}`} className="text-sm font-normal">
                        Primary Key
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`nullable-${index}`}
                        checked={column.nullable}
                        onCheckedChange={(checked) => updateColumnField(index, 'nullable', checked)}
                        disabled={column.isPrimaryKey}
                      />
                      <Label htmlFor={`nullable-${index}`} className="text-sm font-normal">
                        Nullable
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`unique-${index}`}
                        checked={column.isUnique}
                        onCheckedChange={(checked) => updateColumnField(index, 'isUnique', checked)}
                      />
                      <Label htmlFor={`unique-${index}`} className="text-sm font-normal">
                        Unique
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`auto-${index}`}
                        checked={column.isAutoIncrement}
                        onCheckedChange={(checked) => updateColumnField(index, 'isAutoIncrement', checked)}
                      />
                      <Label htmlFor={`auto-${index}`} className="text-sm font-normal">
                        Auto Increment
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addNewColumn} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{tableId ? 'Update' : 'Create'} Table</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
