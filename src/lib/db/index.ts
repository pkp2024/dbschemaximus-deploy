import Dexie, { type Table } from 'dexie';
import type {
  Project,
  TableEntity,
  Column,
  Relationship,
  CanvasState,
} from '@/types/schema';

// Define the database class
export class DrawSQLDatabase extends Dexie {
  // Define table types
  projects!: Table<Project, string>;
  schemaTables!: Table<TableEntity, string>;
  columns!: Table<Column, string>;
  relationships!: Table<Relationship, string>;
  canvasStates!: Table<CanvasState, string>;

  constructor() {
    super('drawsql-clone');

    // Define schema version 1
    this.version(1).stores({
      projects: 'id, createdAt, updatedAt',
      schemaTables: 'id, projectId, [projectId+updatedAt]',
      columns: 'id, tableId, [tableId+orderIndex]',
      relationships: 'id, projectId, sourceTableId, targetTableId',
      canvasStates: 'projectId',
    });
  }
}

// Create and export the database instance
export const db = new DrawSQLDatabase();

// Export a function to clear all data (useful for testing/debugging)
export async function clearAllData() {
  await db.projects.clear();
  await db.schemaTables.clear();
  await db.columns.clear();
  await db.relationships.clear();
  await db.canvasStates.clear();
}

// Export a function to delete the entire database
export async function deleteDatabase() {
  await db.delete();
}
