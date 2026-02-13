import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type {
  Project,
  TableEntity,
  Column,
  Relationship,
  CanvasState,
  TablePosition,
  DataType,
  ReferentialAction,
} from '@/types/schema';

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now();
  const project: Project = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.add(project);
  return project.id;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return await db.projects.get(id);
}

export async function getAllProjects(): Promise<Project[]> {
  return await db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
  await db.projects.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade delete: delete all tables, columns, and relationships
  const tables = await db.schemaTables.where('projectId').equals(id).toArray();
  const tableIds = tables.map(t => t.id);

  // Delete all relationships in this project
  await db.relationships.where('projectId').equals(id).delete();

  // Delete all columns in all tables
  await db.columns.where('tableId').anyOf(tableIds).delete();

  // Delete all tables in this project
  await db.schemaTables.where('projectId').equals(id).delete();

  // Delete canvas state
  await db.canvasStates.delete(id);

  // Finally, delete the project
  await db.projects.delete(id);
}

// ============================================================================
// TABLE OPERATIONS
// ============================================================================

export async function createTable(
  data: Omit<TableEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now();
  const table: TableEntity = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.schemaTables.add(table);

  // Update project's updatedAt
  await updateProject(data.projectId, {});

  return table.id;
}

export async function getTable(id: string): Promise<TableEntity | undefined> {
  return await db.schemaTables.get(id);
}

export async function getTablesByProject(projectId: string): Promise<TableEntity[]> {
  return await db.schemaTables.where('projectId').equals(projectId).toArray();
}

export async function updateTable(
  id: string,
  updates: Partial<Omit<TableEntity, 'id' | 'projectId' | 'createdAt'>>
): Promise<void> {
  const table = await db.schemaTables.get(id);
  if (!table) throw new Error('Table not found');

  await db.schemaTables.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });

  // Update project's updatedAt
  await updateProject(table.projectId, {});
}

export async function moveTable(id: string, position: TablePosition): Promise<void> {
  await updateTable(id, { position });
}

export async function moveTables(moves: Array<{ id: string; position: TablePosition }>): Promise<void> {
  for (const move of moves) {
    await moveTable(move.id, move.position);
  }
}

export async function deleteTable(id: string): Promise<void> {
  const table = await db.schemaTables.get(id);
  if (!table) return;

  // Delete all columns in this table
  await db.columns.where('tableId').equals(id).delete();

  // Delete all relationships involving this table
  await db.relationships
    .where('sourceTableId')
    .equals(id)
    .or('targetTableId')
    .equals(id)
    .delete();

  // Delete the table
  await db.schemaTables.delete(id);

  // Update project's updatedAt
  await updateProject(table.projectId, {});
}

// ============================================================================
// COLUMN OPERATIONS
// ============================================================================

export async function createColumn(
  data: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now();
  const column: Column = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.columns.add(column);

  // Update table's updatedAt
  const table = await db.schemaTables.get(data.tableId);
  if (table) {
    await updateTable(data.tableId, {});
  }

  return column.id;
}

export async function getColumn(id: string): Promise<Column | undefined> {
  return await db.columns.get(id);
}

export async function getColumnsByTable(tableId: string): Promise<Column[]> {
  return await db.columns
    .where('tableId')
    .equals(tableId)
    .sortBy('orderIndex');
}

export async function updateColumn(
  id: string,
  updates: Partial<Omit<Column, 'id' | 'tableId' | 'createdAt'>>
): Promise<void> {
  const column = await db.columns.get(id);
  if (!column) throw new Error('Column not found');

  await db.columns.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });

  // Update table's updatedAt
  await updateTable(column.tableId, {});
}

export async function deleteColumn(id: string): Promise<void> {
  const column = await db.columns.get(id);
  if (!column) return;

  // Delete all relationships involving this column
  await db.relationships
    .where('sourceColumnId')
    .equals(id)
    .or('targetColumnId')
    .equals(id)
    .delete();

  // Delete the column
  await db.columns.delete(id);

  // Update table's updatedAt
  await updateTable(column.tableId, {});
}

export async function reorderColumns(tableId: string, columnIds: string[]): Promise<void> {
  // Update the orderIndex for each column
  const updates = columnIds.map((columnId, index) =>
    db.columns.update(columnId, { orderIndex: index })
  );

  await Promise.all(updates);

  // Update table's updatedAt
  await updateTable(tableId, {});
}

// ============================================================================
// RELATIONSHIP OPERATIONS
// ============================================================================

export async function createRelationship(
  data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
  options?: {
    validateDataTypes?: boolean;
  }
): Promise<string> {
  const validateDataTypes = options?.validateDataTypes ?? true;

  // Validate that source and target columns exist.
  const sourceColumn = await db.columns.get(data.sourceColumnId);
  const targetColumn = await db.columns.get(data.targetColumnId);

  if (!sourceColumn || !targetColumn) {
    throw new Error('Source or target column not found');
  }

  if (validateDataTypes && sourceColumn.dataType !== targetColumn.dataType) {
    throw new Error('Column data types must match');
  }

  const now = Date.now();
  const relationship: Relationship = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.relationships.add(relationship);

  // Update project's updatedAt
  await updateProject(data.projectId, {});

  return relationship.id;
}

export async function getRelationship(id: string): Promise<Relationship | undefined> {
  return await db.relationships.get(id);
}

export async function getRelationshipsByProject(projectId: string): Promise<Relationship[]> {
  return await db.relationships.where('projectId').equals(projectId).toArray();
}

export async function getRelationshipsByTable(tableId: string): Promise<Relationship[]> {
  const relationships = await db.relationships
    .where('sourceTableId')
    .equals(tableId)
    .or('targetTableId')
    .equals(tableId)
    .toArray();

  return relationships;
}

export async function updateRelationship(
  id: string,
  updates: Partial<Omit<Relationship, 'id' | 'projectId' | 'createdAt'>>
): Promise<void> {
  const relationship = await db.relationships.get(id);
  if (!relationship) throw new Error('Relationship not found');

  await db.relationships.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });

  // Update project's updatedAt
  await updateProject(relationship.projectId, {});
}

export async function deleteRelationship(id: string): Promise<void> {
  const relationship = await db.relationships.get(id);
  if (!relationship) return;

  await db.relationships.delete(id);

  // Update project's updatedAt
  await updateProject(relationship.projectId, {});
}

// ============================================================================
// CANVAS STATE OPERATIONS
// ============================================================================

export async function saveCanvasState(state: CanvasState): Promise<void> {
  await db.canvasStates.put({
    ...state,
    updatedAt: Date.now(),
  });
}

export async function getCanvasState(projectId: string): Promise<CanvasState | undefined> {
  return await db.canvasStates.get(projectId);
}

export async function deleteCanvasState(projectId: string): Promise<void> {
  await db.canvasStates.delete(projectId);
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

export async function getProjectStats(projectId: string) {
  const tables = await getTablesByProject(projectId);
  const tableIds = tables.map(t => t.id);

  const allColumns = await Promise.all(
    tableIds.map(id => getColumnsByTable(id))
  );
  const totalColumns = allColumns.reduce((sum, cols) => sum + cols.length, 0);

  const relationships = await getRelationshipsByProject(projectId);

  return {
    tableCount: tables.length,
    columnCount: totalColumns,
    relationshipCount: relationships.length,
  };
}

export async function duplicateTable(tableId: string, newPosition?: TablePosition): Promise<string> {
  const table = await getTable(tableId);
  if (!table) throw new Error('Table not found');

  const columns = await getColumnsByTable(tableId);

  // Create new table
  const newTableId = await createTable({
    projectId: table.projectId,
    name: `${table.name}_copy`,
    description: table.description,
    position: newPosition || { x: table.position.x + 50, y: table.position.y + 50 },
    color: table.color,
  });

  // Create new columns
  for (const column of columns) {
    await createColumn({
      tableId: newTableId,
      name: column.name,
      dataType: column.dataType,
      length: column.length,
      precision: column.precision,
      scale: column.scale,
      nullable: column.nullable,
      isPrimaryKey: column.isPrimaryKey,
      isUnique: column.isUnique,
      isAutoIncrement: column.isAutoIncrement,
      defaultValue: column.defaultValue,
      description: column.description,
      orderIndex: column.orderIndex,
    });
  }

  return newTableId;
}

// Validate table name uniqueness within a project
export async function isTableNameUnique(projectId: string, tableName: string, excludeTableId?: string): Promise<boolean> {
  const tables = await getTablesByProject(projectId);
  return !tables.some(t => t.name === tableName && t.id !== excludeTableId);
}

// Validate column name uniqueness within a table
export async function isColumnNameUnique(tableId: string, columnName: string, excludeColumnId?: string): Promise<boolean> {
  const columns = await getColumnsByTable(tableId);
  return !columns.some(c => c.name === columnName && c.id !== excludeColumnId);
}
