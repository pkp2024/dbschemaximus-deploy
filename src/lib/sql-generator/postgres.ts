import type { TableEntity, Column, Relationship, DataType } from '@/types/schema';

// PostgreSQL data type mapping
const DATA_TYPE_MAP: Record<string, string> = {
  INTEGER: 'INTEGER',
  BIGINT: 'BIGINT',
  SMALLINT: 'SMALLINT',
  DECIMAL: 'DECIMAL',
  NUMERIC: 'NUMERIC',
  REAL: 'REAL',
  'DOUBLE PRECISION': 'DOUBLE PRECISION',
  SERIAL: 'SERIAL',
  BIGSERIAL: 'BIGSERIAL',
  VARCHAR: 'VARCHAR',
  CHAR: 'CHAR',
  TEXT: 'TEXT',
  DATE: 'DATE',
  TIME: 'TIME',
  TIMESTAMP: 'TIMESTAMP',
  TIMESTAMPTZ: 'TIMESTAMPTZ',
  DATETIME: 'TIMESTAMP',
  BOOLEAN: 'BOOLEAN',
  BLOB: 'BYTEA',
  BYTEA: 'BYTEA',
  JSON: 'JSON',
  JSONB: 'JSONB',
  UUID: 'UUID',
};

function mapDataType(column: Column): string {
  const baseType = DATA_TYPE_MAP[column.dataType] || column.dataType;

  if (column.length && (column.dataType === 'VARCHAR' || column.dataType === 'CHAR')) {
    return `${baseType}(${column.length})`;
  }

  if (column.precision && column.scale && (column.dataType === 'DECIMAL' || column.dataType === 'NUMERIC')) {
    return `${baseType}(${column.precision},${column.scale})`;
  }

  return baseType;
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

    if (!column.nullable) {
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

  // Primary key constraint
  const pkColumns = columns.filter(c => c.isPrimaryKey);
  if (pkColumns.length > 0) {
    const pkNames = pkColumns.map(c => c.name).join(', ');
    constraints.push(`  PRIMARY KEY (${pkNames})`);
  }

  lines.push([...columnDefs, ...constraints].join(',\n'));
  lines.push(');');

  return lines.join('\n');
}

export function generateAlterTableFK(
  relationship: Relationship,
  sourceTable: TableEntity,
  targetTable: TableEntity,
  sourceColumn: Column,
  targetColumn: Column
): string {
  const constraintName = relationship.name || `fk_${sourceTable.name}_${targetTable.name}`;

  const parts: string[] = [];
  parts.push(`ALTER TABLE ${sourceTable.name}`);
  parts.push(`  ADD CONSTRAINT ${constraintName}`);
  parts.push(`  FOREIGN KEY (${sourceColumn.name})`);
  parts.push(`  REFERENCES ${targetTable.name}(${targetColumn.name})`);
  parts.push(`  ON DELETE ${relationship.onDelete}`);
  parts.push(`  ON UPDATE ${relationship.onUpdate};`);

  return parts.join('\n');
}
