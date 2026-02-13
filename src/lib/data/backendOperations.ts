import type {
  CanvasState,
  Column,
  Project,
  Relationship,
  SchemaExport,
  TableEntity,
  TablePosition,
} from '@/types/schema';

const API_BASE = '/api';
const CANVAS_STATE_STORAGE_PREFIX = 'drawsql.canvas-state';

const tableProjectMap = new Map<string, string>();
const columnTableMap = new Map<string, string>();
const relationshipProjectMap = new Map<string, string>();

function getCanvasStateStorageKey(projectId: string): string {
  return `${CANVAS_STATE_STORAGE_PREFIX}:${projectId}`;
}

function ensureClientStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Canvas state storage is only available in the browser');
  }

  return window.localStorage;
}

function indexSchema(schema: SchemaExport): void {
  for (const table of schema.tables) {
    tableProjectMap.set(table.id, schema.project.id);
  }

  for (const column of schema.columns) {
    columnTableMap.set(column.id, column.tableId);
  }

  for (const relationship of schema.relationships) {
    relationshipProjectMap.set(relationship.id, schema.project.id);
  }
}

function removeSchemaIndexes(schema: SchemaExport): void {
  for (const table of schema.tables) {
    tableProjectMap.delete(table.id);
  }

  for (const column of schema.columns) {
    columnTableMap.delete(column.id);
  }

  for (const relationship of schema.relationships) {
    relationshipProjectMap.delete(relationship.id);
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

async function getProjectSchema(projectId: string): Promise<SchemaExport> {
  const schema = await apiRequest<SchemaExport>(`/projects/${projectId}/schema`);
  indexSchema(schema);
  return schema;
}

async function putProjectSchema(projectId: string, schema: SchemaExport): Promise<void> {
  await apiRequest<{ ok: true }>(`/projects/${projectId}/schema`, {
    method: 'PUT',
    body: JSON.stringify(schema),
  });

  indexSchema(schema);
}

async function getAllSchemas(): Promise<SchemaExport[]> {
  const projects = await getAllProjects();
  const schemas = await Promise.all(
    projects.map((project) => getProjectSchema(project.id).catch(() => null))
  );

  return schemas.filter((schema): schema is SchemaExport => schema !== null);
}

async function findTableById(tableId: string): Promise<{ schema: SchemaExport; table: TableEntity } | null> {
  const indexedProjectId = tableProjectMap.get(tableId);
  if (indexedProjectId) {
    const schema = await getProjectSchema(indexedProjectId);
    const table = schema.tables.find((candidate) => candidate.id === tableId);
    if (table) {
      return { schema, table };
    }
  }

  const schemas = await getAllSchemas();
  for (const schema of schemas) {
    const table = schema.tables.find((candidate) => candidate.id === tableId);
    if (table) {
      return { schema, table };
    }
  }

  return null;
}

async function findColumnById(columnId: string): Promise<{ schema: SchemaExport; column: Column } | null> {
  const indexedTableId = columnTableMap.get(columnId);
  if (indexedTableId) {
    const locatedTable = await findTableById(indexedTableId);
    if (locatedTable) {
      const column = locatedTable.schema.columns.find((candidate) => candidate.id === columnId);
      if (column) {
        return { schema: locatedTable.schema, column };
      }
    }
  }

  const schemas = await getAllSchemas();
  for (const schema of schemas) {
    const column = schema.columns.find((candidate) => candidate.id === columnId);
    if (column) {
      return { schema, column };
    }
  }

  return null;
}

async function findRelationshipById(relationshipId: string): Promise<{ schema: SchemaExport; relationship: Relationship } | null> {
  const indexedProjectId = relationshipProjectMap.get(relationshipId);
  if (indexedProjectId) {
    const schema = await getProjectSchema(indexedProjectId);
    const relationship = schema.relationships.find((candidate) => candidate.id === relationshipId);
    if (relationship) {
      return { schema, relationship };
    }
  }

  const schemas = await getAllSchemas();
  for (const schema of schemas) {
    const relationship = schema.relationships.find((candidate) => candidate.id === relationshipId);
    if (relationship) {
      return { schema, relationship };
    }
  }

  return null;
}

function createDefaultSchema(project: Project): SchemaExport {
  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    project,
    tables: [],
    columns: [],
    relationships: [],
  };
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const project = await apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return project.id;
}

export async function getProject(id: string): Promise<Project | undefined> {
  try {
    return await apiRequest<Project>(`/projects/${id}`);
  } catch {
    return undefined;
  }
}

export async function getAllProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/projects');
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
  await apiRequest<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: updates.name,
      description: updates.description,
    }),
  });
}

export async function deleteProject(id: string): Promise<void> {
  let schema: SchemaExport | null = null;

  try {
    schema = await getProjectSchema(id);
  } catch {
    schema = null;
  }

  await apiRequest<{ ok: true }>(`/projects/${id}`, {
    method: 'DELETE',
  });

  if (schema) {
    removeSchemaIndexes(schema);
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(getCanvasStateStorageKey(id));
  }
}

// ============================================================================
// TABLE OPERATIONS
// ============================================================================

export async function createTable(
  data: Omit<TableEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const schema = await getProjectSchema(data.projectId);
  const now = Date.now();
  const table: TableEntity = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  schema.tables.push(table);
  schema.exportedAt = now;
  await putProjectSchema(data.projectId, schema);

  return table.id;
}

export async function getTable(id: string): Promise<TableEntity | undefined> {
  const match = await findTableById(id);
  return match?.table;
}

export async function getTablesByProject(projectId: string): Promise<TableEntity[]> {
  const schema = await getProjectSchema(projectId);
  return schema.tables;
}

export async function updateTable(
  id: string,
  updates: Partial<Omit<TableEntity, 'id' | 'projectId' | 'createdAt'>>
): Promise<void> {
  const match = await findTableById(id);
  if (!match) throw new Error('Table not found');

  const now = Date.now();
  const nextTable: TableEntity = {
    ...match.table,
    ...updates,
    updatedAt: now,
  };

  match.schema.tables = match.schema.tables.map((table) => (table.id === id ? nextTable : table));
  match.schema.exportedAt = now;

  await putProjectSchema(nextTable.projectId, match.schema);
}

export async function moveTable(id: string, position: TablePosition): Promise<void> {
  await updateTable(id, { position });
}

export async function moveTables(moves: Array<{ id: string; position: TablePosition }>): Promise<void> {
  const latestPositionById = new Map<string, TablePosition>();
  for (const move of moves) {
    latestPositionById.set(move.id, move.position);
  }

  if (latestPositionById.size === 0) {
    return;
  }

  const byProject = new Map<string, Array<{ id: string; position: TablePosition }>>();

  for (const [tableId, position] of latestPositionById.entries()) {
    let projectId = tableProjectMap.get(tableId);

    if (!projectId) {
      const tableMatch = await findTableById(tableId);
      projectId = tableMatch?.schema.project.id;
    }

    if (!projectId) {
      continue;
    }

    const list = byProject.get(projectId) ?? [];
    list.push({ id: tableId, position });
    byProject.set(projectId, list);
  }

  for (const [projectId, projectMoves] of byProject.entries()) {
    const schema = await getProjectSchema(projectId);
    const now = Date.now();
    const positionById = new Map(projectMoves.map((move) => [move.id, move.position]));

    schema.tables = schema.tables.map((table) => {
      const position = positionById.get(table.id);
      if (!position) {
        return table;
      }

      return {
        ...table,
        position,
        updatedAt: now,
      };
    });

    schema.exportedAt = now;
    await putProjectSchema(projectId, schema);
  }
}

export async function deleteTable(id: string): Promise<void> {
  const match = await findTableById(id);
  if (!match) return;

  const now = Date.now();
  const removedColumnIds = new Set(
    match.schema.columns
      .filter((column) => column.tableId === id)
      .map((column) => column.id)
  );

  match.schema.tables = match.schema.tables.filter((table) => table.id !== id);
  match.schema.columns = match.schema.columns.filter((column) => column.tableId !== id);
  match.schema.relationships = match.schema.relationships.filter((relationship) => (
    relationship.sourceTableId !== id
    && relationship.targetTableId !== id
    && !removedColumnIds.has(relationship.sourceColumnId)
    && !removedColumnIds.has(relationship.targetColumnId)
  ));
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
}

// ============================================================================
// COLUMN OPERATIONS
// ============================================================================

export async function createColumn(
  data: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const tableMatch = await findTableById(data.tableId);
  if (!tableMatch) throw new Error('Table not found');

  const now = Date.now();
  const column: Column = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  tableMatch.schema.columns.push(column);
  tableMatch.schema.tables = tableMatch.schema.tables.map((table) => (
    table.id === data.tableId
      ? { ...table, updatedAt: now }
      : table
  ));
  tableMatch.schema.exportedAt = now;

  await putProjectSchema(tableMatch.schema.project.id, tableMatch.schema);

  return column.id;
}

export async function getColumn(id: string): Promise<Column | undefined> {
  const match = await findColumnById(id);
  return match?.column;
}

export async function getColumnsByTable(tableId: string): Promise<Column[]> {
  const tableMatch = await findTableById(tableId);
  if (!tableMatch) {
    return [];
  }

  return tableMatch.schema.columns
    .filter((column) => column.tableId === tableId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function updateColumn(
  id: string,
  updates: Partial<Omit<Column, 'id' | 'tableId' | 'createdAt'>>
): Promise<void> {
  const match = await findColumnById(id);
  if (!match) throw new Error('Column not found');

  const now = Date.now();
  const nextColumn: Column = {
    ...match.column,
    ...updates,
    updatedAt: now,
  };

  match.schema.columns = match.schema.columns.map((column) => (column.id === id ? nextColumn : column));
  match.schema.tables = match.schema.tables.map((table) => (
    table.id === nextColumn.tableId
      ? { ...table, updatedAt: now }
      : table
  ));
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
}

export async function deleteColumn(id: string): Promise<void> {
  const match = await findColumnById(id);
  if (!match) return;

  const now = Date.now();
  match.schema.columns = match.schema.columns.filter((column) => column.id !== id);
  match.schema.relationships = match.schema.relationships.filter((relationship) => (
    relationship.sourceColumnId !== id && relationship.targetColumnId !== id
  ));
  match.schema.tables = match.schema.tables.map((table) => (
    table.id === match.column.tableId
      ? { ...table, updatedAt: now }
      : table
  ));
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
}

export async function reorderColumns(tableId: string, columnIds: string[]): Promise<void> {
  const tableMatch = await findTableById(tableId);
  if (!tableMatch) throw new Error('Table not found');

  const now = Date.now();
  const indexById = new Map(columnIds.map((id, index) => [id, index]));

  tableMatch.schema.columns = tableMatch.schema.columns.map((column) => {
    if (column.tableId !== tableId) {
      return column;
    }

    const orderIndex = indexById.get(column.id);
    if (orderIndex === undefined) {
      return column;
    }

    return {
      ...column,
      orderIndex,
      updatedAt: now,
    };
  });

  tableMatch.schema.tables = tableMatch.schema.tables.map((table) => (
    table.id === tableId
      ? { ...table, updatedAt: now }
      : table
  ));
  tableMatch.schema.exportedAt = now;

  await putProjectSchema(tableMatch.schema.project.id, tableMatch.schema);
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
  const schema = await getProjectSchema(data.projectId);

  const sourceColumn = schema.columns.find((column) => column.id === data.sourceColumnId);
  const targetColumn = schema.columns.find((column) => column.id === data.targetColumnId);

  if (!sourceColumn || !targetColumn) {
    throw new Error('Source or target column not found');
  }

  const validateDataTypes = options?.validateDataTypes ?? true;
  if (validateDataTypes && sourceColumn.dataType !== targetColumn.dataType) {
    throw new Error('Column data types must match');
  }

  const now = Date.now();
  const relationship: Relationship = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  schema.relationships.push(relationship);
  schema.exportedAt = now;
  await putProjectSchema(data.projectId, schema);

  return relationship.id;
}

export async function getRelationship(id: string): Promise<Relationship | undefined> {
  const match = await findRelationshipById(id);
  return match?.relationship;
}

export async function getRelationshipsByProject(projectId: string): Promise<Relationship[]> {
  const schema = await getProjectSchema(projectId);
  return schema.relationships;
}

export async function getRelationshipsByTable(tableId: string): Promise<Relationship[]> {
  const tableMatch = await findTableById(tableId);
  if (!tableMatch) {
    return [];
  }

  return tableMatch.schema.relationships.filter((relationship) => (
    relationship.sourceTableId === tableId || relationship.targetTableId === tableId
  ));
}

export async function updateRelationship(
  id: string,
  updates: Partial<Omit<Relationship, 'id' | 'projectId' | 'createdAt'>>
): Promise<void> {
  const match = await findRelationshipById(id);
  if (!match) throw new Error('Relationship not found');

  const now = Date.now();
  const nextRelationship: Relationship = {
    ...match.relationship,
    ...updates,
    updatedAt: now,
  };

  match.schema.relationships = match.schema.relationships.map((relationship) => (
    relationship.id === id ? nextRelationship : relationship
  ));
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
}

export async function deleteRelationship(id: string): Promise<void> {
  const match = await findRelationshipById(id);
  if (!match) return;

  const now = Date.now();
  match.schema.relationships = match.schema.relationships.filter((relationship) => relationship.id !== id);
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
}

// ============================================================================
// CANVAS STATE OPERATIONS
// ============================================================================

export async function saveCanvasState(state: CanvasState): Promise<void> {
  const storage = ensureClientStorage();
  const payload: CanvasState = {
    ...state,
    updatedAt: Date.now(),
  };

  storage.setItem(getCanvasStateStorageKey(state.projectId), JSON.stringify(payload));
}

export async function getCanvasState(projectId: string): Promise<CanvasState | undefined> {
  const storage = ensureClientStorage();
  const raw = storage.getItem(getCanvasStateStorageKey(projectId));

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as CanvasState;
  } catch {
    return undefined;
  }
}

export async function deleteCanvasState(projectId: string): Promise<void> {
  const storage = ensureClientStorage();
  storage.removeItem(getCanvasStateStorageKey(projectId));
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

export async function getProjectStats(projectId: string) {
  const schema = await getProjectSchema(projectId);

  return {
    tableCount: schema.tables.length,
    columnCount: schema.columns.length,
    relationshipCount: schema.relationships.length,
  };
}

export async function duplicateTable(tableId: string, newPosition?: TablePosition): Promise<string> {
  const match = await findTableById(tableId);
  if (!match) throw new Error('Table not found');

  const now = Date.now();
  const newTableId = crypto.randomUUID();

  const newTable: TableEntity = {
    ...match.table,
    id: newTableId,
    name: `${match.table.name}_copy`,
    position: newPosition || { x: match.table.position.x + 50, y: match.table.position.y + 50 },
    createdAt: now,
    updatedAt: now,
  };

  const sourceColumns = match.schema.columns
    .filter((column) => column.tableId === tableId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const newColumns: Column[] = sourceColumns.map((column) => ({
    ...column,
    id: crypto.randomUUID(),
    tableId: newTableId,
    createdAt: now,
    updatedAt: now,
  }));

  match.schema.tables.push(newTable);
  match.schema.columns.push(...newColumns);
  match.schema.exportedAt = now;

  await putProjectSchema(match.schema.project.id, match.schema);
  return newTableId;
}

export async function isTableNameUnique(projectId: string, tableName: string, excludeTableId?: string): Promise<boolean> {
  const schema = await getProjectSchema(projectId);
  return !schema.tables.some((table) => table.name === tableName && table.id !== excludeTableId);
}

export async function isColumnNameUnique(tableId: string, columnName: string, excludeColumnId?: string): Promise<boolean> {
  const tableMatch = await findTableById(tableId);
  if (!tableMatch) {
    return true;
  }

  return !tableMatch.schema.columns
    .filter((column) => column.tableId === tableId)
    .some((column) => column.name === columnName && column.id !== excludeColumnId);
}

export async function ensureSchemaForProject(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  try {
    await getProjectSchema(projectId);
  } catch {
    const schema = createDefaultSchema(project);
    await putProjectSchema(projectId, schema);
  }
}
