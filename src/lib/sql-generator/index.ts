import { format } from 'sql-formatter';
import type { SQLDialect, TableEntity, Column, Relationship } from '@/types/schema';
import * as postgres from './postgres';
import * as mysql from './mysql';
import * as sqlite from './sqlite';

export interface SQLGeneratorOptions {
  dialect: SQLDialect;
  tables: TableEntity[];
  columns: Column[];
  relationships: Relationship[];
}

export function generateSQL(options: SQLGeneratorOptions): string {
  const { dialect, tables, columns, relationships } = options;

  // Create maps for easy lookup
  const columnsMap = new Map<string, Column[]>();
  columns.forEach((col) => {
    if (!columnsMap.has(col.tableId)) {
      columnsMap.set(col.tableId, []);
    }
    columnsMap.get(col.tableId)!.push(col);
  });

  // Sort columns by orderIndex
  columnsMap.forEach((cols) => {
    cols.sort((a, b) => a.orderIndex - b.orderIndex);
  });

  const tablesMap = new Map(tables.map(t => [t.id, t]));
  const columnsById = new Map(columns.map(c => [c.id, c]));

  const statements: string[] = [];

  // Generate header
  statements.push(`-- Generated SQL for ${dialect.toUpperCase()}`);
  statements.push(`-- Generated at: ${new Date().toISOString()}`);
  statements.push(`-- Tables: ${tables.length}, Relationships: ${relationships.length}`);
  statements.push('');

  // Generate CREATE TABLE statements
  switch (dialect) {
    case SQLDialect.POSTGRESQL:
      for (const table of tables) {
        const tableCols = columnsMap.get(table.id) || [];
        statements.push(postgres.generateCreateTable(table, tableCols));
        statements.push('');
      }
      break;

    case SQLDialect.MYSQL:
      for (const table of tables) {
        const tableCols = columnsMap.get(table.id) || [];
        statements.push(mysql.generateCreateTable(table, tableCols));
        statements.push('');
      }
      break;

    case SQLDialect.SQLITE:
      // SQLite requires foreign keys to be defined inline
      for (const table of tables) {
        const tableCols = columnsMap.get(table.id) || [];
        const tableRelationships = relationships.filter(r => r.sourceTableId === table.id);
        statements.push(sqlite.generateCreateTableWithFK(
          table,
          tableCols,
          tableRelationships,
          tablesMap,
          columnsById
        ));
        statements.push('');
      }
      break;
  }

  // Generate ALTER TABLE for foreign keys (PostgreSQL and MySQL only)
  if (dialect !== SQLDialect.SQLITE) {
    if (relationships.length > 0) {
      statements.push('-- Foreign Key Constraints');
      statements.push('');

      for (const rel of relationships) {
        const sourceTable = tablesMap.get(rel.sourceTableId);
        const targetTable = tablesMap.get(rel.targetTableId);
        const sourceColumn = columnsById.get(rel.sourceColumnId);
        const targetColumn = columnsById.get(rel.targetColumnId);

        if (sourceTable && targetTable && sourceColumn && targetColumn) {
          if (dialect === SQLDialect.POSTGRESQL) {
            statements.push(postgres.generateAlterTableFK(
              rel,
              sourceTable,
              targetTable,
              sourceColumn,
              targetColumn
            ));
          } else if (dialect === SQLDialect.MYSQL) {
            statements.push(mysql.generateAlterTableFK(
              rel,
              sourceTable,
              targetTable,
              sourceColumn,
              targetColumn
            ));
          }
          statements.push('');
        }
      }
    }
  }

  const sql = statements.join('\n');

  // Format the SQL
  try {
    return format(sql, {
      language: dialect === SQLDialect.POSTGRESQL ? 'postgresql' : dialect === SQLDialect.MYSQL ? 'mysql' : 'sqlite',
      indentStyle: 'standard',
      keywordCase: 'upper',
    });
  } catch (error) {
    // If formatting fails, return unformatted SQL
    console.error('SQL formatting error:', error);
    return sql;
  }
}
