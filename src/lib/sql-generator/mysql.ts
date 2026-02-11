import type { TableEntity, Column, Relationship } from '@/types/schema';

// MySQL data type mapping
const DATA_TYPE_MAP: Record<string, string> = {
  INTEGER: 'INT',
  BIGINT: 'BIGINT',
  SMALLINT: 'SMALLINT',
  DECIMAL: 'DECIMAL',
  NUMERIC: 'DECIMAL',
  REAL: 'FLOAT',
  'DOUBLE PRECISION': 'DOUBLE',
  SERIAL: 'INT AUTO_INCREMENT',
  BIGSERIAL: 'BIGINT AUTO_INCREMENT',
  VARCHAR: 'VARCHAR',
  CHAR: 'CHAR',
  TEXT: 'TEXT',
  DATE: 'DATE',
  TIME: 'TIME',
  TIMESTAMP: 'TIMESTAMP',
  TIMESTAMPTZ: 'TIMESTAMP',
  DATETIME: 'DATETIME',
  BOOLEAN: 'TINYINT(1)',
  BLOB: 'BLOB',
  BYTEA: 'BLOB',
  JSON: 'JSON',
  JSONB: 'JSON',
  UUID: 'CHAR(36)',
};

function mapDataType(column: Column): string {
  let baseType = DATA_TYPE_MAP[column.dataType] || column.dataType;

  // Handle serial types
  if (column.dataType === 'SERIAL' || column.dataType === 'BIGSERIAL') {
    if (column.isAutoIncrement) {
      return baseType;
    } else {
      return column.dataType === 'SERIAL' ? 'INT' : 'BIGINT';
    }
  }

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

  lines.push(`CREATE TABLE \`${table.name}\` (`);

  const columnDefs: string[] = [];
  const constraints: string[] = [];

  // Column definitions
  for (const column of columns) {
    const parts: string[] = [];
    parts.push(`  \`${column.name}\``);
    parts.push(mapDataType(column));

    if (!column.nullable) {
      parts.push('NOT NULL');
    }

    if (column.isAutoIncrement && column.dataType !== 'SERIAL' && column.dataType !== 'BIGSERIAL') {
      parts.push('AUTO_INCREMENT');
    }

    if (column.defaultValue) {
      parts.push(`DEFAULT ${column.defaultValue}`);
    }

    if (column.isUnique && !column.isPrimaryKey) {
      parts.push('UNIQUE');
    }

    if (column.description) {
      parts.push(`COMMENT '${column.description.replace(/'/g, "''")}'`);
    }

    columnDefs.push(parts.join(' '));
  }

  // Primary key constraint
  const pkColumns = columns.filter(c => c.isPrimaryKey);
  if (pkColumns.length > 0) {
    const pkNames = pkColumns.map(c => `\`${c.name}\``).join(', ');
    constraints.push(`  PRIMARY KEY (${pkNames})`);
  }

  lines.push([...columnDefs, ...constraints].join(',\n'));
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

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
  parts.push(`ALTER TABLE \`${sourceTable.name}\``);
  parts.push(`  ADD CONSTRAINT \`${constraintName}\``);
  parts.push(`  FOREIGN KEY (\`${sourceColumn.name}\`)`);
  parts.push(`  REFERENCES \`${targetTable.name}\`(\`${targetColumn.name}\`)`);
  parts.push(`  ON DELETE ${relationship.onDelete}`);
  parts.push(`  ON UPDATE ${relationship.onUpdate};`);

  return parts.join('\n');
}
