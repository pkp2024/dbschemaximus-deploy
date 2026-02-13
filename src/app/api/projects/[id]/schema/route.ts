import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/sql';
import { ensureDbSchema } from '@/lib/server/postgres';
import type {
  Column,
  Project,
  Relationship,
  SchemaExport,
  TableEntity,
  TablePosition,
  DataType,
  ReferentialAction,
} from '@/types/schema';

export const runtime = 'nodejs';

type DbProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

type DbTableRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  position: TablePosition;
  color: string | null;
  created_at: number;
  updated_at: number;
};

type DbColumnRow = {
  id: string;
  table_id: string;
  name: string;
  data_type: string;
  length: number | null;
  precision: number | null;
  scale: number | null;
  nullable: boolean;
  is_primary_key: boolean;
  is_unique: boolean;
  is_auto_increment: boolean;
  default_value: string | null;
  description: string | null;
  order_index: number;
  created_at: number;
  updated_at: number;
};

type DbRelationshipRow = {
  id: string;
  project_id: string;
  name: string | null;
  source_table_id: string;
  source_column_id: string;
  target_table_id: string;
  target_column_id: string;
  on_delete: string;
  on_update: string;
  created_at: number;
  updated_at: number;
};

function mapProject(row: DbProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapTable(row: DbTableRow): TableEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    position: row.position,
    color: row.color ?? undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapColumn(row: DbColumnRow): Column {
  return {
    id: row.id,
    tableId: row.table_id,
    name: row.name,
    dataType: row.data_type as DataType,
    length: row.length ?? undefined,
    precision: row.precision ?? undefined,
    scale: row.scale ?? undefined,
    nullable: row.nullable,
    isPrimaryKey: row.is_primary_key,
    isUnique: row.is_unique,
    isAutoIncrement: row.is_auto_increment,
    defaultValue: row.default_value ?? undefined,
    description: row.description ?? undefined,
    orderIndex: row.order_index,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapRelationship(row: DbRelationshipRow): Relationship {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name ?? undefined,
    sourceTableId: row.source_table_id,
    sourceColumnId: row.source_column_id,
    targetTableId: row.target_table_id,
    targetColumnId: row.target_column_id,
    onDelete: row.on_delete as ReferentialAction,
    onUpdate: row.on_update as ReferentialAction,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function validateSchemaPayload(input: unknown): SchemaExport | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as SchemaExport;
  if (!candidate.project || !Array.isArray(candidate.tables) || !Array.isArray(candidate.columns)) {
    return null;
  }

  return {
    version: candidate.version || '1.0.0',
    exportedAt: typeof candidate.exportedAt === 'number' ? candidate.exportedAt : Date.now(),
    project: candidate.project,
    tables: candidate.tables,
    columns: candidate.columns,
    relationships: Array.isArray(candidate.relationships) ? candidate.relationships : [],
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDbSchema();
  const { id: projectId } = await context.params;

  const projectResult = await sql<DbProjectRow>`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE id = ${projectId}
    LIMIT 1
  `;

  if (projectResult.rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const tablesResult = await sql<DbTableRow>`
    SELECT id, project_id, name, description, position, color, created_at, updated_at
    FROM schema_tables
    WHERE project_id = ${projectId}
    ORDER BY created_at ASC
  `;

  const columnsResult = await sql<DbColumnRow>`
    SELECT id, table_id, name, data_type, length, precision, scale,
      nullable, is_primary_key, is_unique, is_auto_increment,
      default_value, description, order_index, created_at, updated_at
    FROM columns
    WHERE table_id IN (
      SELECT id FROM schema_tables WHERE project_id = ${projectId}
    )
    ORDER BY order_index ASC, created_at ASC
  `;

  const relationshipsResult = await sql<DbRelationshipRow>`
    SELECT id, project_id, name, source_table_id, source_column_id, target_table_id, target_column_id,
      on_delete, on_update, created_at, updated_at
    FROM relationships
    WHERE project_id = ${projectId}
    ORDER BY created_at ASC
  `;

  const response: SchemaExport = {
    version: '1.0.0',
    exportedAt: Date.now(),
    project: mapProject(projectResult.rows[0]),
    tables: tablesResult.rows.map(mapTable),
    columns: columnsResult.rows.map(mapColumn),
    relationships: relationshipsResult.rows.map(mapRelationship),
  };

  return NextResponse.json(response);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDbSchema();
  const { id: projectId } = await context.params;
  const payload = validateSchemaPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: 'Invalid schema payload' }, { status: 400 });
  }

  const now = Date.now();
  const projectName = payload.project.name?.trim();

  if (!projectName) {
    return NextResponse.json({ error: 'project.name is required' }, { status: 400 });
  }

  const projectDescription = payload.project.description?.trim() || null;

  const existingProject = await sql<DbProjectRow>`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE id = ${projectId}
    LIMIT 1
  `;

  if (existingProject.rows.length === 0) {
    await sql`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (${projectId}, ${projectName}, ${projectDescription}, ${now}, ${now})
    `;
  } else {
    await sql`
      UPDATE projects
      SET name = ${projectName}, description = ${projectDescription}, updated_at = ${now}
      WHERE id = ${projectId}
    `;
  }

  await sql`DELETE FROM schema_tables WHERE project_id = ${projectId}`;

  for (const table of payload.tables) {
    const tableId = table.id || crypto.randomUUID();
    await sql`
      INSERT INTO schema_tables (id, project_id, name, description, position, color, created_at, updated_at)
      VALUES (
        ${tableId},
        ${projectId},
        ${table.name},
        ${table.description || null},
        ${JSON.stringify(table.position || { x: 0, y: 0 })}::jsonb,
        ${table.color || null},
        ${table.createdAt || now},
        ${now}
      )
    `;
  }

  for (const column of payload.columns) {
    const raw = column as Column & {
      table_id?: string;
      data_type?: string;
      is_primary_key?: boolean | null;
      is_unique?: boolean | null;
      is_auto_increment?: boolean | null;
      default_value?: string | null;
      order_index?: number;
    };

    const tableId = raw.tableId || raw.table_id;
    const dataType = raw.dataType || (raw.data_type as DataType | undefined);

    if (!tableId || !raw.name || !dataType) {
      continue;
    }

    await sql`
      INSERT INTO columns (
        id, table_id, name, data_type, length, precision, scale,
        nullable, is_primary_key, is_unique, is_auto_increment,
        default_value, description, order_index, created_at, updated_at
      )
      VALUES (
        ${raw.id || crypto.randomUUID()},
        ${tableId},
        ${raw.name},
        ${dataType},
        ${raw.length ?? null},
        ${raw.precision ?? null},
        ${raw.scale ?? null},
        ${raw.nullable ?? true},
        ${raw.isPrimaryKey ?? raw.is_primary_key ?? false},
        ${raw.isUnique ?? raw.is_unique ?? false},
        ${raw.isAutoIncrement ?? raw.is_auto_increment ?? false},
        ${raw.defaultValue ?? raw.default_value ?? null},
        ${raw.description ?? null},
        ${raw.orderIndex ?? raw.order_index ?? 0},
        ${raw.createdAt || now},
        ${now}
      )
    `;
  }

  for (const rel of payload.relationships) {
    await sql`
      INSERT INTO relationships (
        id, project_id, name, source_table_id, source_column_id,
        target_table_id, target_column_id, on_delete, on_update, created_at, updated_at
      )
      VALUES (
        ${rel.id || crypto.randomUUID()},
        ${projectId},
        ${rel.name || null},
        ${rel.sourceTableId},
        ${rel.sourceColumnId},
        ${rel.targetTableId},
        ${rel.targetColumnId},
        ${rel.onDelete},
        ${rel.onUpdate},
        ${rel.createdAt || now},
        ${now}
      )
    `;
  }

  return NextResponse.json({ ok: true });
}
