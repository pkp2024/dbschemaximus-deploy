'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useSchemaStore } from '@/lib/store/schemaStore';
import { useTable, useColumns, useRelationships, useTables } from '@/hooks/useSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Key, Link2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { DataType, type Column } from '@/types/schema';

const DATA_TYPES = Object.values(DataType);

interface NewColumnForm {
  name: string;
  dataType: DataType;
  length?: number;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
}

function formatColumnType(column: Pick<Column, 'dataType' | 'length' | 'precision' | 'scale'>): string {
  if (column.length) return `${column.dataType}(${column.length})`;
  if (column.precision && column.scale !== undefined) {
    return `${column.dataType}(${column.precision},${column.scale})`;
  }
  return column.dataType;
}

export default function PropertiesPanel() {
  const { selectedNodeId, setSelectedNode } = useCanvasStore();
  const table = useTable(selectedNodeId);
  const columns = useColumns(selectedNodeId);
  const allTables = useTables();
  const allColumnsMap = useSchemaStore((state) => state.columns);
  const { updateTable, updateColumn, deleteColumn, addColumn, reorderColumns } = useSchemaStore();
  const allRelationships = useRelationships();

  const [expandedTableIds, setExpandedTableIds] = useState<Set<string>>(new Set());
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // New column form
  const [newColumn, setNewColumn] = useState<NewColumnForm>({
    name: '',
    dataType: DataType.VARCHAR,
    length: 255,
    nullable: true,
    isPrimaryKey: false,
    isUnique: false,
    isAutoIncrement: false,
  });

  const columnsByTable = useMemo(() => {
    const grouped = new Map<string, Column[]>();

    for (const column of allColumnsMap.values()) {
      const list = grouped.get(column.tableId) ?? [];
      list.push(column);
      grouped.set(column.tableId, list);
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return grouped;
  }, [allColumnsMap]);

  useEffect(() => {
    setExpandedTableIds((prev) => {
      const next = new Set<string>();
      const tableIdSet = new Set(allTables.map((item) => item.id));

      for (const tableId of prev) {
        if (tableIdSet.has(tableId)) {
          next.add(tableId);
        }
      }

      if (selectedNodeId && tableIdSet.has(selectedNodeId)) {
        next.add(selectedNodeId);
      }

      return next;
    });
  }, [allTables, selectedNodeId]);

  const handleSelectAndToggleTable = (tableId: string) => {
    setSelectedNode(tableId);
    setExpandedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const handleUpdateTableName = async (name: string) => {
    if (selectedNodeId && name.trim()) {
      await updateTable(selectedNodeId, { name });
    }
  };

  const handleUpdateTableDescription = async (description: string) => {
    if (selectedNodeId) {
      await updateTable(selectedNodeId, { description });
    }
  };

  const handleUpdateColumn = async (columnId: string, updates: Partial<Column>) => {
    await updateColumn(columnId, updates);
    setEditingColumnId(null);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (confirm('Delete this column?')) {
      await deleteColumn(columnId);
    }
  };

  const handleAddColumn = async () => {
    if (!selectedNodeId || !newColumn.name.trim()) return;

    await addColumn({
      tableId: selectedNodeId,
      name: newColumn.name,
      dataType: newColumn.dataType,
      length: newColumn.length,
      nullable: newColumn.nullable,
      isPrimaryKey: newColumn.isPrimaryKey,
      isUnique: newColumn.isUnique,
      isAutoIncrement: newColumn.isAutoIncrement,
      orderIndex: columns.length,
    });

    // Reset form
    setNewColumn({
      name: '',
      dataType: DataType.VARCHAR,
      length: 255,
      nullable: true,
      isPrimaryKey: false,
      isUnique: false,
      isAutoIncrement: false,
    });
    setIsAddingColumn(false);
  };

  const handleColumnDragStart = (columnId: string) => {
    setDraggedColumnId(columnId);
    setDragOverColumnId(null);
    setEditingColumnId(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleColumnDrop = async (targetColumnId: string) => {
    if (!selectedNodeId || !draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const orderedIds = columns.map((column) => column.id);
    const draggedIndex = orderedIds.indexOf(draggedColumnId);
    const targetIndex = orderedIds.indexOf(targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    orderedIds.splice(draggedIndex, 1);
    orderedIds.splice(targetIndex, 0, draggedColumnId);

    await reorderColumns(selectedNodeId, orderedIds);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  // Get relationships for selected table
  const tableRelationships = allRelationships.filter(
    rel => rel.sourceTableId === selectedNodeId || rel.targetTableId === selectedNodeId
  );

  return (
    <div className="w-96 border-l bg-white overflow-y-auto">
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">Schema Explorer</h3>
        <p className="text-xs text-slate-500 mt-1">{allTables.length} tables</p>
      </div>

      <div className="p-3 space-y-2">
        {allTables.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">No tables available</div>
        )}

        {allTables.map((item) => {
          const itemColumns = columnsByTable.get(item.id) ?? [];
          const isExpanded = expandedTableIds.has(item.id);
          const isSelected = selectedNodeId === item.id;

          return (
            <Card key={item.id} className={isSelected ? 'border-primary' : ''}>
              <button
                type="button"
                onClick={() => handleSelectAndToggleTable(item.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900">{item.name}</p>
                  <p className="text-[11px] text-slate-500">{itemColumns.length} columns</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  {isSelected && table && (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">Table Name</Label>
                          <Input
                            value={table.name}
                            onChange={(e) => handleUpdateTableName(e.target.value)}
                            className="font-medium h-8"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">Description</Label>
                          <Input
                            value={table.description || ''}
                            onChange={(e) => handleUpdateTableDescription(e.target.value)}
                            placeholder="Optional description"
                            className="h-8"
                          />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-600">Columns ({columns.length})</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsAddingColumn(!isAddingColumn)}
                              className="h-7 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>

                          {isAddingColumn && (
                            <Card className="p-3 space-y-3 bg-blue-50 border-blue-200">
                              <Input
                                placeholder="Column name"
                                value={newColumn.name}
                                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                                className="h-8 text-sm"
                              />
                              <Select
                                value={newColumn.dataType}
                                onValueChange={(value) => setNewColumn({ ...newColumn, dataType: value as DataType })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DATA_TYPES.map((type) => (
                                    <SelectItem key={type} value={type} className="text-sm">
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {(newColumn.dataType === DataType.VARCHAR || newColumn.dataType === DataType.CHAR) && (
                                <Input
                                  type="number"
                                  placeholder="Length"
                                  value={newColumn.length || ''}
                                  onChange={(e) => setNewColumn({ ...newColumn, length: parseInt(e.target.value, 10) || undefined })}
                                  className="h-8 text-sm"
                                />
                              )}

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="new-pk"
                                    checked={newColumn.isPrimaryKey}
                                    onCheckedChange={(checked) =>
                                      setNewColumn({
                                        ...newColumn,
                                        isPrimaryKey: checked as boolean,
                                        nullable: checked ? false : newColumn.nullable,
                                      })
                                    }
                                  />
                                  <Label htmlFor="new-pk" className="text-xs">
                                    Primary Key
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="new-nullable"
                                    checked={newColumn.nullable}
                                    onCheckedChange={(checked) => setNewColumn({ ...newColumn, nullable: checked as boolean })}
                                    disabled={newColumn.isPrimaryKey}
                                  />
                                  <Label htmlFor="new-nullable" className="text-xs">
                                    Nullable
                                  </Label>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button onClick={handleAddColumn} size="sm" className="flex-1 h-7 text-xs">
                                  Add Column
                                </Button>
                                <Button
                                  onClick={() => {
                                    setIsAddingColumn(false);
                                    setNewColumn({
                                      name: '',
                                      dataType: DataType.VARCHAR,
                                      length: 255,
                                      nullable: true,
                                      isPrimaryKey: false,
                                      isUnique: false,
                                      isAutoIncrement: false,
                                    });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </Card>
                          )}

                          <div className="space-y-2">
                            {columns.map((column) => (
                              <Card
                                key={column.id}
                                draggable
                                onDragStart={() => handleColumnDragStart(column.id)}
                                onDragOver={(event) => handleColumnDragOver(event, column.id)}
                                onDrop={() => void handleColumnDrop(column.id)}
                                onDragEnd={handleColumnDragEnd}
                                className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
                                  dragOverColumnId === column.id ? 'ring-2 ring-primary/50 border-primary/40' : ''
                                }`}
                                onClick={() => setEditingColumnId(editingColumnId === column.id ? null : column.id)}
                              >
                                <div className="space-y-2">
                                  <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      {column.isPrimaryKey && <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                      <span className="font-medium text-sm truncate">{column.name}</span>
                                    </div>
                                    <div className="text-right min-w-0">
                                      <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                        {formatColumnType(column)}
                                      </span>
                                      {!column.nullable && (
                                        <span className="text-red-500 text-[10px] ml-1 font-semibold">NOT NULL</span>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteColumn(column.id);
                                      }}
                                      className="h-6 w-6 text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  {editingColumnId === column.id && (
                                    <div className="pt-2 space-y-2 border-t">
                                      <Input
                                        value={column.name}
                                        onChange={(e) => handleUpdateColumn(column.id, { name: e.target.value })}
                                        className="h-7 text-sm"
                                        placeholder="Column name"
                                      />
                                      <Select
                                        value={column.dataType}
                                        onValueChange={(value) => handleUpdateColumn(column.id, { dataType: value as DataType })}
                                      >
                                        <SelectTrigger className="h-7 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {DATA_TYPES.map((type) => (
                                            <SelectItem key={type} value={type} className="text-sm">
                                              {type}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            id={`pk-${column.id}`}
                                            checked={column.isPrimaryKey}
                                            onCheckedChange={(checked) =>
                                              handleUpdateColumn(column.id, {
                                                isPrimaryKey: checked as boolean,
                                                nullable: checked ? false : column.nullable,
                                              })
                                            }
                                          />
                                          <Label htmlFor={`pk-${column.id}`} className="text-xs">
                                            PK
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            id={`null-${column.id}`}
                                            checked={column.nullable}
                                            onCheckedChange={(checked) =>
                                              handleUpdateColumn(column.id, { nullable: checked as boolean })
                                            }
                                            disabled={column.isPrimaryKey}
                                          />
                                          <Label htmlFor={`null-${column.id}`} className="text-xs">
                                            Nullable
                                          </Label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {tableRelationships.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <Label className="text-xs text-slate-600">Relationships ({tableRelationships.length})</Label>
                              <div className="space-y-2">
                                {tableRelationships.map((rel) => (
                                  <Card key={rel.id} className="p-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <Link2 className="w-3 h-3" />
                                      <span className="text-slate-900 font-medium">
                                        {rel.sourceTableId === selectedNodeId ? 'Foreign Key' : 'Referenced by'}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 mt-1">
                                      ON DELETE: {rel.onDelete}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
