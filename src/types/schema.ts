// Enums and Constants
export enum DataType {
  // Numeric types
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  SMALLINT = 'SMALLINT',
  DECIMAL = 'DECIMAL',
  NUMERIC = 'NUMERIC',
  REAL = 'REAL',
  DOUBLE_PRECISION = 'DOUBLE PRECISION',
  SERIAL = 'SERIAL',
  BIGSERIAL = 'BIGSERIAL',

  // String types
  VARCHAR = 'VARCHAR',
  CHAR = 'CHAR',
  TEXT = 'TEXT',

  // Date/Time types
  DATE = 'DATE',
  TIME = 'TIME',
  TIMESTAMP = 'TIMESTAMP',
  TIMESTAMPTZ = 'TIMESTAMPTZ',
  DATETIME = 'DATETIME',

  // Boolean
  BOOLEAN = 'BOOLEAN',

  // Binary
  BLOB = 'BLOB',
  BYTEA = 'BYTEA',

  // JSON
  JSON = 'JSON',
  JSONB = 'JSONB',

  // UUID
  UUID = 'UUID',
}

export enum ReferentialAction {
  CASCADE = 'CASCADE',
  SET_NULL = 'SET NULL',
  RESTRICT = 'RESTRICT',
  NO_ACTION = 'NO ACTION',
  SET_DEFAULT = 'SET DEFAULT',
}

export enum SQLDialect {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
}

// Core Domain Models
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TablePosition {
  x: number;
  y: number;
}

export interface TableEntity {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  position: TablePosition;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Column {
  id: string;
  tableId: string;
  name: string;
  dataType: DataType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
  description?: string;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  projectId: string;
  name?: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasState {
  projectId: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  updatedAt: number;
}

// Composite models for UI
export interface TableWithColumns {
  table: TableEntity;
  columns: Column[];
}

export interface RelationshipWithDetails {
  relationship: Relationship;
  sourceTable: TableEntity;
  sourceColumn: Column;
  targetTable: TableEntity;
  targetColumn: Column;
}

// Export/Import format
export interface SchemaExport {
  version: string;
  exportedAt: number;
  project: Project;
  tables: TableEntity[];
  columns: Column[];
  relationships: Relationship[];
}

// Constants
export const DATA_TYPE_CATEGORIES = {
  Numeric: [
    DataType.INTEGER,
    DataType.BIGINT,
    DataType.SMALLINT,
    DataType.DECIMAL,
    DataType.NUMERIC,
    DataType.REAL,
    DataType.DOUBLE_PRECISION,
    DataType.SERIAL,
    DataType.BIGSERIAL,
  ],
  String: [
    DataType.VARCHAR,
    DataType.CHAR,
    DataType.TEXT,
  ],
  'Date/Time': [
    DataType.DATE,
    DataType.TIME,
    DataType.TIMESTAMP,
    DataType.TIMESTAMPTZ,
    DataType.DATETIME,
  ],
  Boolean: [
    DataType.BOOLEAN,
  ],
  Binary: [
    DataType.BLOB,
    DataType.BYTEA,
  ],
  JSON: [
    DataType.JSON,
    DataType.JSONB,
  ],
  Other: [
    DataType.UUID,
  ],
};

// Data types that require length specification
export const DATA_TYPES_WITH_LENGTH = new Set([
  DataType.VARCHAR,
  DataType.CHAR,
]);

// Data types that require precision/scale
export const DATA_TYPES_WITH_PRECISION = new Set([
  DataType.DECIMAL,
  DataType.NUMERIC,
]);

// Default table colors
export const DEFAULT_TABLE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// Get a random table color
export function getRandomTableColor(): string {
  return DEFAULT_TABLE_COLORS[Math.floor(Math.random() * DEFAULT_TABLE_COLORS.length)];
}
