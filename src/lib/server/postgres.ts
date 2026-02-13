import { sql } from '@/lib/server/sql';

export async function ensureDbSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS schema_tables (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      position JSONB NOT NULL,
      color TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL REFERENCES schema_tables(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      data_type TEXT NOT NULL,
      length INTEGER,
      precision INTEGER,
      scale INTEGER,
      nullable BOOLEAN NOT NULL,
      is_primary_key BOOLEAN NOT NULL,
      is_unique BOOLEAN NOT NULL,
      is_auto_increment BOOLEAN NOT NULL,
      default_value TEXT,
      description TEXT,
      order_index INTEGER NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT,
      source_table_id TEXT NOT NULL REFERENCES schema_tables(id) ON DELETE CASCADE,
      source_column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      target_table_id TEXT NOT NULL REFERENCES schema_tables(id) ON DELETE CASCADE,
      target_column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      on_delete TEXT NOT NULL,
      on_update TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS canvas_states (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      zoom DOUBLE PRECISION NOT NULL,
      offset_x DOUBLE PRECISION NOT NULL,
      offset_y DOUBLE PRECISION NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_schema_tables_project_id ON schema_tables(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_columns_table_id ON columns(table_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_columns_table_order ON columns(table_id, order_index)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationships_project_id ON relationships(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationships_source_table_id ON relationships(source_table_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationships_target_table_id ON relationships(target_table_id)`;
}
