import { useSchemaStore } from '@/lib/store/schemaStore';
import { useMemo } from 'react';

export function useSchema() {
  return useSchemaStore();
}

export function useCurrentProject() {
  return useSchemaStore(state => state.currentProjectId);
}

export function useTables() {
  const tables = useSchemaStore(state => state.tables);
  return useMemo(() => Array.from(tables.values()), [tables]);
}

export function useTable(tableId: string | null) {
  return useSchemaStore(state => tableId ? state.tables.get(tableId) : undefined);
}

export function useColumns(tableId: string | null) {
  const columns = useSchemaStore(state => state.columns);
  return useMemo(() => {
    if (!tableId) return [];
    return Array.from(columns.values())
      .filter(col => col.tableId === tableId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [columns, tableId]);
}

export function useRelationships() {
  const relationships = useSchemaStore(state => state.relationships);
  return useMemo(() => Array.from(relationships.values()), [relationships]);
}

export function useTableRelationships(tableId: string | null) {
  const relationships = useSchemaStore(state => state.relationships);
  return useMemo(() => {
    if (!tableId) return [];
    return Array.from(relationships.values())
      .filter(rel => rel.sourceTableId === tableId || rel.targetTableId === tableId);
  }, [relationships, tableId]);
}
