import { getPersistenceMode } from '@/lib/persistence/mode';

type FrontendOps = typeof import('@/lib/db/operations');
type BackendOps = typeof import('@/lib/data/backendOperations');
type Ops = FrontendOps & BackendOps;

async function resolveOps(): Promise<Ops> {
  if (getPersistenceMode() === 'backend') {
    return (await import('@/lib/data/backendOperations')) as Ops;
  }

  return (await import('@/lib/db/operations')) as Ops;
}

export const createProject: FrontendOps['createProject'] = async (...args) => (await resolveOps()).createProject(...args);
export const getProject: FrontendOps['getProject'] = async (...args) => (await resolveOps()).getProject(...args);
export const getAllProjects: FrontendOps['getAllProjects'] = async (...args) => (await resolveOps()).getAllProjects(...args);
export const updateProject: FrontendOps['updateProject'] = async (...args) => (await resolveOps()).updateProject(...args);
export const deleteProject: FrontendOps['deleteProject'] = async (...args) => (await resolveOps()).deleteProject(...args);

export const createTable: FrontendOps['createTable'] = async (...args) => (await resolveOps()).createTable(...args);
export const getTable: FrontendOps['getTable'] = async (...args) => (await resolveOps()).getTable(...args);
export const getTablesByProject: FrontendOps['getTablesByProject'] = async (...args) => (await resolveOps()).getTablesByProject(...args);
export const updateTable: FrontendOps['updateTable'] = async (...args) => (await resolveOps()).updateTable(...args);
export const moveTable: FrontendOps['moveTable'] = async (...args) => (await resolveOps()).moveTable(...args);
export const moveTables: FrontendOps['moveTables'] = async (...args) => (await resolveOps()).moveTables(...args);
export const deleteTable: FrontendOps['deleteTable'] = async (...args) => (await resolveOps()).deleteTable(...args);

export const createColumn: FrontendOps['createColumn'] = async (...args) => (await resolveOps()).createColumn(...args);
export const getColumn: FrontendOps['getColumn'] = async (...args) => (await resolveOps()).getColumn(...args);
export const getColumnsByTable: FrontendOps['getColumnsByTable'] = async (...args) => (await resolveOps()).getColumnsByTable(...args);
export const updateColumn: FrontendOps['updateColumn'] = async (...args) => (await resolveOps()).updateColumn(...args);
export const deleteColumn: FrontendOps['deleteColumn'] = async (...args) => (await resolveOps()).deleteColumn(...args);
export const reorderColumns: FrontendOps['reorderColumns'] = async (...args) => (await resolveOps()).reorderColumns(...args);

export const createRelationship: FrontendOps['createRelationship'] = async (...args) => (await resolveOps()).createRelationship(...args);
export const getRelationship: FrontendOps['getRelationship'] = async (...args) => (await resolveOps()).getRelationship(...args);
export const getRelationshipsByProject: FrontendOps['getRelationshipsByProject'] = async (...args) => (await resolveOps()).getRelationshipsByProject(...args);
export const getRelationshipsByTable: FrontendOps['getRelationshipsByTable'] = async (...args) => (await resolveOps()).getRelationshipsByTable(...args);
export const updateRelationship: FrontendOps['updateRelationship'] = async (...args) => (await resolveOps()).updateRelationship(...args);
export const deleteRelationship: FrontendOps['deleteRelationship'] = async (...args) => (await resolveOps()).deleteRelationship(...args);

export const saveCanvasState: FrontendOps['saveCanvasState'] = async (...args) => (await resolveOps()).saveCanvasState(...args);
export const getCanvasState: FrontendOps['getCanvasState'] = async (...args) => (await resolveOps()).getCanvasState(...args);
export const deleteCanvasState: FrontendOps['deleteCanvasState'] = async (...args) => (await resolveOps()).deleteCanvasState(...args);

export const getProjectStats: FrontendOps['getProjectStats'] = async (...args) => (await resolveOps()).getProjectStats(...args);
export const duplicateTable: FrontendOps['duplicateTable'] = async (...args) => (await resolveOps()).duplicateTable(...args);
export const isTableNameUnique: FrontendOps['isTableNameUnique'] = async (...args) => (await resolveOps()).isTableNameUnique(...args);
export const isColumnNameUnique: FrontendOps['isColumnNameUnique'] = async (...args) => (await resolveOps()).isColumnNameUnique(...args);
