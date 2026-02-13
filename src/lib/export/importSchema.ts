import type {
  Column,
  DataType,
  ReferentialAction,
  Relationship,
  SchemaExport,
  TableEntity,
} from '@/types/schema';
import * as dbOps from '@/lib/data/operations';
import { getPersistenceMode } from '@/lib/persistence/mode';

const IMPORT_LAYOUT = {
  startX: 100,
  startY: 100,
  horizontalGap: 420,
  verticalGap: 320,
  projectOffsetX: 520,
} as const;

function normalizeJsonInput(jsonString: string): string {
  // Remove UTF-8 BOM and trim whitespace to avoid parse failures from editor-exported files.
  return jsonString.replace(/^\uFEFF/, '').trim();
}

function getImportGridColumns(tableCount: number): number {
  if (tableCount <= 1) return 1;
  if (tableCount <= 4) return 2;
  if (tableCount <= 9) return 3;
  return 4;
}

export function validateSchemaExport(data: unknown): SchemaExport {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid schema export: not an object');
  }

  const schema = data as Record<string, unknown>;

  if (!schema.project || typeof schema.project !== 'object' || schema.project === null) {
    throw new Error('Invalid schema export: missing or invalid project');
  }

  if (!Array.isArray(schema.tables)) {
    throw new Error('Invalid schema export: missing or invalid tables');
  }

  if (!Array.isArray(schema.columns)) {
    throw new Error('Invalid schema export: missing or invalid columns');
  }

  // Backward compatibility: relationships may be omitted in older/manual exports.
  if (schema.relationships !== undefined && !Array.isArray(schema.relationships)) {
    throw new Error('Invalid schema export: invalid relationships');
  }

  return {
    version: typeof schema.version === 'string' ? schema.version : '1.0.0',
    exportedAt: typeof schema.exportedAt === 'number' ? schema.exportedAt : Date.now(),
    project: schema.project as SchemaExport['project'],
    tables: schema.tables as SchemaExport['tables'],
    columns: schema.columns as SchemaExport['columns'],
    relationships: (schema.relationships ?? []) as SchemaExport['relationships'],
  };
}

export async function importFromJSON(jsonString: string, projectId: string): Promise<void> {
  const normalized = normalizeJsonInput(jsonString);
  if (!normalized) {
    throw new Error('Invalid JSON format: file is empty');
  }

  let data: unknown;

  try {
    data = JSON.parse(normalized);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  const schema = validateSchemaExport(data);
  const isBackendMode = getPersistenceMode() === 'backend';

  if (isBackendMode) {
    await importToBackend(schema, projectId);
    return;
  }

  await importToFrontend(schema, projectId);
}

async function importToFrontend(schema: SchemaExport, projectId: string): Promise<void> {
  const existingTables = await dbOps.getTablesByProject(projectId);
  const maxExistingX = existingTables.length > 0
    ? Math.max(...existingTables.map((table) => table.position?.x ?? 0))
    : null;
  const minExistingY = existingTables.length > 0
    ? Math.min(...existingTables.map((table) => table.position?.y ?? IMPORT_LAYOUT.startY))
    : IMPORT_LAYOUT.startY;
  const gridStartX = maxExistingX === null
    ? IMPORT_LAYOUT.startX
    : maxExistingX + IMPORT_LAYOUT.projectOffsetX;
  const gridStartY = minExistingY;
  const columnsPerRow = getImportGridColumns(schema.tables.length);

  // Create mapping from old IDs to new IDs
  const tableIdMap = new Map<string, string>();
  const columnIdMap = new Map<string, string>();

  // Import tables
  for (const [index, table] of schema.tables.entries()) {
    const row = Math.floor(index / columnsPerRow);
    const column = index % columnsPerRow;
    const newTableId = await dbOps.createTable({
      projectId,
      name: table.name,
      description: table.description,
      // Keep imported tables aligned and spaced so relationships remain readable.
      position: {
        x: gridStartX + column * IMPORT_LAYOUT.horizontalGap,
        y: gridStartY + row * IMPORT_LAYOUT.verticalGap,
      },
      color: table.color,
    });
    tableIdMap.set(table.id, newTableId);
  }

  // Import columns
  for (const column of schema.columns) {
    const newTableId = tableIdMap.get(column.tableId);
    if (!newTableId) {
      console.warn(`Skipping column ${column.name}: table not found`);
      continue;
    }

    const newColumnId = await dbOps.createColumn({
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
    columnIdMap.set(column.id, newColumnId);
  }

  // Import relationships
  for (const rel of schema.relationships) {
    const newSourceTableId = tableIdMap.get(rel.sourceTableId);
    const newTargetTableId = tableIdMap.get(rel.targetTableId);
    const newSourceColumnId = columnIdMap.get(rel.sourceColumnId);
    const newTargetColumnId = columnIdMap.get(rel.targetColumnId);

    if (!newSourceTableId || !newTargetTableId || !newSourceColumnId || !newTargetColumnId) {
      console.warn('Skipping relationship: missing table or column');
      continue;
    }

    try {
      await dbOps.createRelationship({
        projectId,
        name: rel.name,
        sourceTableId: newSourceTableId,
        sourceColumnId: newSourceColumnId,
        targetTableId: newTargetTableId,
        targetColumnId: newTargetColumnId,
        onDelete: rel.onDelete,
        onUpdate: rel.onUpdate,
      }, {
        // External schemas may use compatible (but not exactly equal) data types for FK columns.
        validateDataTypes: false,
      });
    } catch (error) {
      console.warn('Skipping relationship:', error);
    }
  }
}

async function importToBackend(schema: SchemaExport, projectId: string): Promise<void> {
  const project = await dbOps.getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const existingResponse = await fetch(`/api/projects/${projectId}/schema`);
  const existingSchema = existingResponse.ok
    ? await existingResponse.json() as SchemaExport
    : {
      version: '1.0.0',
      exportedAt: Date.now(),
      project,
      tables: [],
      columns: [],
      relationships: [],
    };

  const existingTables = existingSchema.tables;
  const maxExistingX = existingTables.length > 0
    ? Math.max(...existingTables.map((table) => table.position?.x ?? 0))
    : null;
  const minExistingY = existingTables.length > 0
    ? Math.min(...existingTables.map((table) => table.position?.y ?? IMPORT_LAYOUT.startY))
    : IMPORT_LAYOUT.startY;
  const gridStartX = maxExistingX === null
    ? IMPORT_LAYOUT.startX
    : maxExistingX + IMPORT_LAYOUT.projectOffsetX;
  const gridStartY = minExistingY;
  const columnsPerRow = getImportGridColumns(schema.tables.length);
  const now = Date.now();

  const tableIdMap = new Map<string, string>();
  const columnIdMap = new Map<string, string>();

  const importedTables: TableEntity[] = schema.tables.map((table, index) => {
    const row = Math.floor(index / columnsPerRow);
    const column = index % columnsPerRow;
    const newId = crypto.randomUUID();
    tableIdMap.set(table.id, newId);

    return {
      ...table,
      id: newId,
      projectId,
      position: {
        x: gridStartX + column * IMPORT_LAYOUT.horizontalGap,
        y: gridStartY + row * IMPORT_LAYOUT.verticalGap,
      },
      createdAt: now,
      updatedAt: now,
    };
  });

  const importedColumns: Column[] = [];
  for (const source of schema.columns) {
    const newTableId = tableIdMap.get(source.tableId);
    if (!newTableId) {
      continue;
    }

    const newId = crypto.randomUUID();
    columnIdMap.set(source.id, newId);

    importedColumns.push({
      ...source,
      id: newId,
      tableId: newTableId,
      dataType: source.dataType as DataType,
      nullable: source.nullable ?? true,
      isPrimaryKey: source.isPrimaryKey ?? false,
      isUnique: source.isUnique ?? false,
      isAutoIncrement: source.isAutoIncrement ?? false,
      orderIndex: source.orderIndex ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  const importedRelationships: Relationship[] = [];
  for (const rel of schema.relationships) {
    const sourceTableId = tableIdMap.get(rel.sourceTableId);
    const targetTableId = tableIdMap.get(rel.targetTableId);
    const sourceColumnId = columnIdMap.get(rel.sourceColumnId);
    const targetColumnId = columnIdMap.get(rel.targetColumnId);

    if (!sourceTableId || !targetTableId || !sourceColumnId || !targetColumnId) {
      continue;
    }

    importedRelationships.push({
      ...rel,
      id: crypto.randomUUID(),
      projectId,
      sourceTableId,
      targetTableId,
      sourceColumnId,
      targetColumnId,
      onDelete: rel.onDelete as ReferentialAction,
      onUpdate: rel.onUpdate as ReferentialAction,
      createdAt: now,
      updatedAt: now,
    });
  }

  const merged: SchemaExport = {
    version: '1.0.0',
    exportedAt: now,
    project: {
      ...existingSchema.project,
      name: project.name,
      description: project.description,
      updatedAt: now,
    },
    tables: [...existingSchema.tables, ...importedTables],
    columns: [...existingSchema.columns, ...importedColumns],
    relationships: [...existingSchema.relationships, ...importedRelationships],
  };

  const putResponse = await fetch(`/api/projects/${projectId}/schema`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(merged),
  });

  if (!putResponse.ok) {
    const errorBody = await putResponse.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorBody?.error || 'Failed to import schema');
  }
}
