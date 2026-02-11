import type { TableEntity, Column, Relationship } from '@/types/schema';

// SQLite data type mapping (SQLite has flexible typing)
const DATA_TYPE_MAP: Record<string, string> = {
  INTEGER: 'INTEGER',
  BIGINT: 'INTEGER',
  SMALLINT: 'INTEGER',
  DECIMAL: 'REAL',
  NUMERIC: 'REAL',
  REAL: 'REAL',
  'DOUBLE PRECISION': 'REAL',
  SERIAL: 'INTEGER',
  BIGSERIAL: 'INTEGER',
  VARCHAR: 'TEXT',
  CHAR: 'TEXT',
  TEXT: 'TEXT',
  DATE: 'TEXT',
  TIME: 'TEXT',
  TIMESTAMP: 'TEXT',
  TIMESTAMPTZ: 'TEXT',
  DATETIME: 'TEXT',
  BOOLEAN: 'INTEGER',
  BLOB: 'BLOB',
  BYTEA: 'BLOB',
  JSON: 'TEXT',
  JSONB: 'TEXT',
  UUID: 'TEXT',
};

function mapDataType(column: Column): string {
  return DATA_TYPE_MAP[column.dataType] || 'TEXT';
}

export function generateCreateTable(table: TableEntity, columns: Column[]): string {
  const lines: string[] = [];

  // Table comment
  if (table.description) {
    lines.push(`-- ${table.description}`);
  }

  lines.push(`CREATE TABLE ${table.name} (`);

  const columnDefs: string[] = [];
  const constraints: string[] = [];

  // Column definitions
  for (const column of columns) {
    const parts: string[] = [];
    parts.push(`  ${column.name}`);
    parts.push(mapDataType(column));

    if (column.isPrimaryKey) {
      parts.push('PRIMARY KEY');
      if (column.isAutoIncrement) {
        parts.push('AUTOINCREMENT');
      }
    }

    if (!column.nullable && !column.isPrimaryKey) {
      parts.push('NOT NULL');
    }

    if (column.defaultValue) {
      parts.push(`DEFAULT ${column.defaultValue}`);
    }

    if (column.isUnique && !column.isPrimaryKey) {
      parts.push('UNIQUE');
    }

    if (column.description) {
      parts.push(`-- ${column.description}`);
    }

    columnDefs.push(parts.join(' '));
  }

  // Foreign keys (inline in SQLite)
  // Note: We'll handle this separately in the main generator

  lines.push(columnDefs.join(',\n'));
  lines.push(');');

  return lines.join('\n');
}

export function generateForeignKey(
  relationship: Relationship,
  sourceTable: TableEntity,
  targetTable: TableEntity,
  sourceColumn: Column,
  targetColumn: Column
): string {
  // SQLite foreign keys are defined inline in CREATE TABLE
  // This function returns a statement to add FK if table already exists
  // Note: SQLite doesn't support ALTER TABLE ADD FOREIGN KEY
  // We'll need to recreate the table or include FKs in CREATE TABLE
  return `-- SQLite doesn't support ALTER TABLE ADD FOREIGN KEY\n-- Foreign key from ${sourceTable.name}.${sourceColumn.name} to ${targetTable.name}.${targetColumn.name}`;
}

// For SQLite, we need to include foreign keys in the CREATE TABLE statement
export function generateCreateTableWithFK(
  table: TableEntity,
  columns: Column[],
  relationships: Relationship[],
  allTables: Map<string, TableEntity>,
  allColumns: Map<string, Column>
): string {
  const lines: string[] = [];

  if (table.description) {
    lines.push(`-- ${table.description}`);
  }

  lines.push(`CREATE TABLE ${table.name} (`);

  const columnDefs: string[] = [];
  const constraints: string[] = [];

  // Column definitions
  for (const column of columns) {
    const parts: string[] = [];
    parts.push(`  ${column.name}`);
    parts.push(mapDataType(column));

    if (column.isPrimaryKey) {
      parts.push('PRIMARY KEY');
      if (column.isAutoIncrement) {
        parts.push('AUTOINCREMENT');
      }
    }

    if (!column.nullable && !column.isPrimaryKey) {
      parts.push('NOT NULL');
    }

    if (column.defaultValue) {
      parts.push(`DEFAULT ${column.defaultValue}`);
    }

    if (column.isUnique && !column.isPrimaryKey) {
      parts.push('UNIQUE');
    }

    columnDefs.push(parts.join(' '));
  }

  // Foreign key constraints
  for (const rel of relationships) {
    if (rel.sourceTableId === table.id) {
      const targetTable = allTables.get(rel.targetTableId);
      const sourceColumn = allColumns.get(rel.sourceColumnId);
      const targetColumn = allColumns.get(rel.targetColumnId);

      if (targetTable && sourceColumn && targetColumn) {
        constraints.push(
          `  FOREIGN KEY (${sourceColumn.name}) REFERENCES ${targetTable.name}(${targetColumn.name}) ON DELETE ${rel.onDelete} ON UPDATE ${rel.onUpdate}`
        );
      }
    }
  }

  lines.push([...columnDefs, ...constraints].join(',\n'));
  lines.push(');');

  return lines.join('\n');
}
