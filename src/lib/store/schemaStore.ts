import { create } from 'zustand';
import type { TableEntity, Column, Relationship, TablePosition, SchemaExport } from '@/types/schema';
import * as dbOps from '@/lib/data/operations';
import { getPersistenceMode } from '@/lib/persistence/mode';

interface SchemaStore {
  // State
  currentProjectId: string | null;
  tables: Map<string, TableEntity>;
  columns: Map<string, Column>;
  relationships: Map<string, Relationship>;
  isLoading: boolean;

  // Actions
  setCurrentProject: (projectId: string) => void;
  loadProject: (projectId: string) => Promise<void>;
  clearProject: () => void;

  // Table operations
  addTable: (table: Omit<TableEntity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTable: (id: string, updates: Partial<Omit<TableEntity, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  moveTables: (moves: Array<{ id: string; position: TablePosition }>) => Promise<void>;
  moveTable: (id: string, position: TablePosition) => Promise<void>;
  duplicateTable: (id: string, position?: TablePosition) => Promise<string>;

  // Column operations
  addColumn: (column: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateColumn: (id: string, updates: Partial<Omit<Column, 'id' | 'tableId' | 'createdAt'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (tableId: string, columnIds: string[]) => Promise<void>;

  // Relationship operations
  addRelationship: (rel: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRelationship: (id: string, updates: Partial<Omit<Relationship, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;

  // Queries
  getTable: (id: string) => TableEntity | undefined;
  getColumnsByTable: (tableId: string) => Column[];
  getRelationshipsByTable: (tableId: string) => Relationship[];
  getAllTables: () => TableEntity[];
  getAllRelationships: () => Relationship[];
}

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  // Initial state
  currentProjectId: null,
  tables: new Map(),
  columns: new Map(),
  relationships: new Map(),
  isLoading: false,

  // Set current project
  setCurrentProject: (projectId: string) => {
    set({ currentProjectId: projectId });
  },

  // Load project data from IndexedDB
  loadProject: async (projectId: string) => {
    set({ isLoading: true });

    try {
      if (getPersistenceMode() === 'backend') {
        const response = await fetch(`/api/projects/${projectId}/schema`);
        const payload = await response.json().catch(() => null) as SchemaExport | { error?: string } | null;

        if (!response.ok || !payload || !('tables' in payload) || !('columns' in payload) || !('relationships' in payload)) {
          const message = payload && typeof payload === 'object' && 'error' in payload
            ? String(payload.error)
            : 'Failed to load project schema';
          throw new Error(message);
        }

        const tablesMap = new Map(payload.tables.map((table) => [table.id, table]));
        const columnsMap = new Map(payload.columns.map((column) => [column.id, column]));
        const relationshipsMap = new Map(payload.relationships.map((relationship) => [relationship.id, relationship]));

        set({
          currentProjectId: projectId,
          tables: tablesMap,
          columns: columnsMap,
          relationships: relationshipsMap,
          isLoading: false,
        });
        return;
      }

      // Load all tables for this project
      const tables = await dbOps.getTablesByProject(projectId);
      const tablesMap = new Map(tables.map(t => [t.id, t]));

      // Load all columns for all tables
      const tableIds = tables.map(t => t.id);
      const allColumns = await Promise.all(
        tableIds.map(id => dbOps.getColumnsByTable(id))
      );
      const columnsMap = new Map(
        allColumns.flat().map(c => [c.id, c])
      );

      // Load all relationships
      const relationships = await dbOps.getRelationshipsByProject(projectId);
      const relationshipsMap = new Map(
        relationships.map(r => [r.id, r])
      );

      set({
        currentProjectId: projectId,
        tables: tablesMap,
        columns: columnsMap,
        relationships: relationshipsMap,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading project:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Clear current project
  clearProject: () => {
    set({
      currentProjectId: null,
      tables: new Map(),
      columns: new Map(),
      relationships: new Map(),
    });
  },

  // ============================================================================
  // TABLE OPERATIONS
  // ============================================================================

  addTable: async (tableData) => {
    const id = await dbOps.createTable(tableData);
    const table = await dbOps.getTable(id);

    if (table) {
      set(state => {
        const newTables = new Map(state.tables);
        newTables.set(id, table);
        return { tables: newTables };
      });
    }

    return id;
  },

  updateTable: async (id, updates) => {
    await dbOps.updateTable(id, updates);
    const table = await dbOps.getTable(id);

    if (table) {
      set(state => {
        const newTables = new Map(state.tables);
        newTables.set(id, table);
        return { tables: newTables };
      });
    }
  },

  deleteTable: async (id) => {
    await dbOps.deleteTable(id);

    set(state => {
      const newTables = new Map(state.tables);
      const newColumns = new Map(state.columns);
      const newRelationships = new Map(state.relationships);

      // Remove the table
      newTables.delete(id);

      // Remove all columns for this table
      for (const [colId, column] of newColumns) {
        if (column.tableId === id) {
          newColumns.delete(colId);
        }
      }

      // Remove all relationships involving this table
      for (const [relId, relationship] of newRelationships) {
        if (relationship.sourceTableId === id || relationship.targetTableId === id) {
          newRelationships.delete(relId);
        }
      }

      return {
        tables: newTables,
        columns: newColumns,
        relationships: newRelationships,
      };
    });
  },

  moveTables: async (moves) => {
    const latestPositionById = new Map<string, TablePosition>();
    for (const move of moves) {
      latestPositionById.set(move.id, move.position);
    }

    if (latestPositionById.size === 0) {
      return;
    }

    const updatedAt = Date.now();
    set((state) => {
      const nextTables = new Map(state.tables);
      for (const [id, position] of latestPositionById) {
        const table = nextTables.get(id);
        if (table) {
          nextTables.set(id, { ...table, position, updatedAt });
        }
      }
      return { tables: nextTables };
    });

    await dbOps.moveTables(
      Array.from(latestPositionById.entries()).map(([id, position]) => ({ id, position }))
    );
  },

  moveTable: async (id, position) => {
    await get().moveTables([{ id, position }]);
  },

  duplicateTable: async (id, position) => {
    const newId = await dbOps.duplicateTable(id, position);

    // Reload the entire project to get the new table and columns
    const { currentProjectId } = get();
    if (currentProjectId) {
      await get().loadProject(currentProjectId);
    }

    return newId;
  },

  // ============================================================================
  // COLUMN OPERATIONS
  // ============================================================================

  addColumn: async (columnData) => {
    const id = await dbOps.createColumn(columnData);
    const column = await dbOps.getColumn(id);

    if (column) {
      set(state => {
        const newColumns = new Map(state.columns);
        newColumns.set(id, column);
        return { columns: newColumns };
      });
    }

    return id;
  },

  updateColumn: async (id, updates) => {
    await dbOps.updateColumn(id, updates);
    const column = await dbOps.getColumn(id);

    if (column) {
      set(state => {
        const newColumns = new Map(state.columns);
        newColumns.set(id, column);
        return { columns: newColumns };
      });
    }
  },

  deleteColumn: async (id) => {
    const column = get().columns.get(id);
    await dbOps.deleteColumn(id);

    set(state => {
      const newColumns = new Map(state.columns);
      const newRelationships = new Map(state.relationships);

      // Remove the column
      newColumns.delete(id);

      // Remove all relationships involving this column
      for (const [relId, relationship] of newRelationships) {
        if (relationship.sourceColumnId === id || relationship.targetColumnId === id) {
          newRelationships.delete(relId);
        }
      }

      return {
        columns: newColumns,
        relationships: newRelationships,
      };
    });
  },

  reorderColumns: async (tableId, columnIds) => {
    await dbOps.reorderColumns(tableId, columnIds);

    // Reload columns for this table
    const columns = await dbOps.getColumnsByTable(tableId);
    set(state => {
      const newColumns = new Map(state.columns);
      columns.forEach(col => newColumns.set(col.id, col));
      return { columns: newColumns };
    });
  },

  // ============================================================================
  // RELATIONSHIP OPERATIONS
  // ============================================================================

  addRelationship: async (relData) => {
    const id = await dbOps.createRelationship(relData);
    const relationship = await dbOps.getRelationship(id);

    if (relationship) {
      set(state => {
        const newRelationships = new Map(state.relationships);
        newRelationships.set(id, relationship);
        return { relationships: newRelationships };
      });
    }

    return id;
  },

  updateRelationship: async (id, updates) => {
    await dbOps.updateRelationship(id, updates);
    const relationship = await dbOps.getRelationship(id);

    if (relationship) {
      set(state => {
        const newRelationships = new Map(state.relationships);
        newRelationships.set(id, relationship);
        return { relationships: newRelationships };
      });
    }
  },

  deleteRelationship: async (id) => {
    await dbOps.deleteRelationship(id);

    set(state => {
      const newRelationships = new Map(state.relationships);
      newRelationships.delete(id);
      return { relationships: newRelationships };
    });
  },

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  getTable: (id: string) => {
    return get().tables.get(id);
  },

  getColumnsByTable: (tableId: string) => {
    return Array.from(get().columns.values())
      .filter(col => col.tableId === tableId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },

  getRelationshipsByTable: (tableId: string) => {
    return Array.from(get().relationships.values())
      .filter(rel => rel.sourceTableId === tableId || rel.targetTableId === tableId);
  },

  getAllTables: () => {
    return Array.from(get().tables.values());
  },

  getAllRelationships: () => {
    return Array.from(get().relationships.values());
  },
}));
