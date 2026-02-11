import { saveAs } from 'file-saver';
import type { Project, TableEntity, Column, Relationship, SchemaExport, SQLDialect } from '@/types/schema';
import * as dbOps from '@/lib/db/operations';
import { generateSQL } from '@/lib/sql-generator';

export async function exportToJSON(projectId: string): Promise<SchemaExport> {
  const project = await dbOps.getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const tables = await dbOps.getTablesByProject(projectId);
  const tableIds = tables.map(t => t.id);

  const allColumns = await Promise.all(
    tableIds.map(id => dbOps.getColumnsByTable(id))
  );
  const columns = allColumns.flat();

  const relationships = await dbOps.getRelationshipsByProject(projectId);

  const schemaExport: SchemaExport = {
    version: '1.0.0',
    exportedAt: Date.now(),
    project,
    tables,
    columns,
    relationships,
  };

  return schemaExport;
}

export async function exportToSQL(projectId: string, dialect: SQLDialect): Promise<string> {
  const schemaExport = await exportToJSON(projectId);

  return generateSQL({
    dialect,
    tables: schemaExport.tables,
    columns: schemaExport.columns,
    relationships: schemaExport.relationships,
  });
}

export async function downloadJSON(projectId: string, projectName: string) {
  const schemaExport = await exportToJSON(projectId);
  const json = JSON.stringify(schemaExport, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const fileName = `${projectName.replace(/\s+/g, '_')}_schema.json`;
  saveAs(blob, fileName);
}

export async function downloadSQL(projectId: string, projectName: string, dialect: SQLDialect) {
  const sql = await exportToSQL(projectId, dialect);
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const fileName = `${projectName.replace(/\s+/g, '_')}_${dialect}.sql`;
  saveAs(blob, fileName);
}
