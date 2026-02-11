import { memo } from 'react';
import { type Node, Handle, Position, NodeProps } from '@xyflow/react';
import { useColumns } from '@/hooks/useSchema';
import { Grip, Edit, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TableEntity } from '@/types/schema';

export interface TableNodeData extends Record<string, unknown> {
  table: TableEntity;
  onEdit?: (tableId: string) => void;
  onDelete?: (tableId: string) => void;
}

export type TableFlowNode = Node<TableNodeData, 'table'>;

function formatColumnType(
  dataType: string,
  length?: number,
  precision?: number,
  scale?: number
): string {
  if (length) return `${dataType}(${length})`;
  if (precision && scale !== undefined) return `${dataType}(${precision},${scale})`;
  return dataType;
}

function TableNode({ data, selected }: NodeProps<TableFlowNode>) {
  const { table, onEdit, onDelete } = data;
  const columns = useColumns(table.id);

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg border-2 min-w-[380px] max-w-[460px]',
        selected ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-slate-200'
      )}
    >
      {/* Table Header */}
      <div
        className="px-4 py-3 rounded-t-lg border-b-2 flex items-center justify-between group"
        style={{
          backgroundColor: table.color || '#3B82F6',
          borderBottomColor: table.color || '#3B82F6',
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Grip className="w-4 h-4 text-white/70 flex-shrink-0 cursor-grab" />
          <h3 className="font-semibold text-base text-white truncate">{table.name}</h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(table.id);
              }}
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(table.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Columns List */}
      <div className="py-1">
        {columns.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-400 text-center">
            No columns yet
          </div>
        ) : (
          columns.map((column) => (
            <div
              key={column.id}
              className="px-4 py-2 hover:bg-slate-50 relative group/column border-b border-slate-100 last:border-b-0"
            >
              {/* Connection handles for relationships */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}-source`}
                className="w-3 h-3 !bg-primary border-2 border-white opacity-0 group-hover/column:opacity-100 transition-opacity"
                style={{ right: -6 }}
              />
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.id}-target`}
                className="w-3 h-3 !bg-primary border-2 border-white opacity-0 group-hover/column:opacity-100 transition-opacity"
                style={{ left: -6 }}
              />

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px] leading-5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {column.isPrimaryKey && (
                    <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'font-medium truncate',
                    column.isPrimaryKey && 'text-amber-700'
                  )}>
                    {column.name}
                  </span>
                  {!column.isPrimaryKey && !column.nullable && (
                    <span className="text-red-500 text-[10px] font-semibold">*</span>
                  )}
                </div>
                <span className="font-mono text-xs tracking-tight text-slate-500 whitespace-nowrap">
                  {formatColumnType(column.dataType, column.length, column.precision, column.scale)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Footer (if needed) */}
      {table.description && (
        <div className="px-4 py-2 border-t bg-slate-50 rounded-b-lg">
          <p className="text-xs text-slate-500 line-clamp-2">{table.description}</p>
        </div>
      )}
    </div>
  );
}

export default memo(TableNode);
