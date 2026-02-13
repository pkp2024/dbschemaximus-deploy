'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnConnect,
  ConnectionMode,
  Panel,
  SelectionMode,
} from '@xyflow/react';
import { useSchemaStore } from '@/lib/store/schemaStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useTables, useRelationships } from '@/hooks/useSchema';
import TableNode, { type TableFlowNode, type TableNodeData } from './TableNode';
import RelationshipEdge, { type RelationshipFlowEdge } from './RelationshipEdge';
import { ReferentialAction } from '@/types/schema';
import { usePersistenceMode } from '@/hooks/usePersistenceMode';

interface SchemaCanvasProps {
  projectId: string;
  onTableEdit?: (tableId: string) => void;
  onTableDelete?: (tableId: string) => void;
}

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

export default function SchemaCanvas({ projectId, onTableEdit, onTableDelete }: SchemaCanvasProps) {
  const { mode } = usePersistenceMode();
  const tables = useTables();
  const relationships = useRelationships();
  const { moveTables, deleteTable, addRelationship, deleteRelationship } = useSchemaStore();
  const {
    setSelectedNode,
    setSelectedEdge,
    clearSelection,
    viewport,
    setViewport,
    saveViewportToDb,
    loadViewportFromDb,
  } = useCanvasStore();

  // Convert tables to React Flow nodes
  const initialNodes: TableFlowNode[] = useMemo(
    () =>
      tables.map((table) => ({
        id: table.id,
        type: 'table',
        position: table.position,
        data: {
          table,
          onEdit: onTableEdit,
          onDelete: onTableDelete,
        },
      })),
    [tables, onTableEdit, onTableDelete]
  );

  // Convert relationships to React Flow edges
  const initialEdges: RelationshipFlowEdge[] = useMemo(
    () =>
      relationships.map((rel) => ({
        id: rel.id,
        type: 'relationship',
        source: rel.sourceTableId,
        target: rel.targetTableId,
        sourceHandle: `${rel.sourceColumnId}-source`,
        targetHandle: `${rel.targetColumnId}-target`,
        data: {
          relationship: rel,
          onDelete: async (relationshipId: string) => {
            if (confirm('Delete this relationship?')) {
              await deleteRelationship(relationshipId);
            }
          },
        },
      })),
    [relationships, deleteRelationship]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipFlowEdge>(initialEdges);

  // Update nodes when tables change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when relationships change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Load saved viewport on mount
  useEffect(() => {
    loadViewportFromDb(projectId);
  }, [projectId, loadViewportFromDb, mode]);

  // Handle node position changes
  const handleNodesChange: OnNodesChange<TableFlowNode> = useCallback(
    async (changes) => {
      onNodesChange(changes);

      const moves = changes
        .filter((change): change is { type: 'position'; id: string; position: { x: number; y: number }; dragging?: boolean } =>
          change.type === 'position' && Boolean(change.position) && change.dragging === false
        )
        .map((change) => ({
          id: change.id,
          position: change.position,
        }));

      if (moves.length > 0) {
        await moveTables(moves);
      }
    },
    [onNodesChange, moveTables]
  );

  // Handle connection creation
  const handleConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return;
      }

      // Extract column IDs from handles (format: "columnId-source" or "columnId-target")
      const sourceColumnId = connection.sourceHandle.replace('-source', '');
      const targetColumnId = connection.targetHandle.replace('-target', '');

      try {
        await addRelationship({
          projectId,
          sourceTableId: connection.source,
          sourceColumnId,
          targetTableId: connection.target,
          targetColumnId,
          onDelete: ReferentialAction.CASCADE,
          onUpdate: ReferentialAction.CASCADE,
        });
      } catch (error) {
        console.error('Error creating relationship:', error);
        alert(error instanceof Error ? error.message : 'Failed to create relationship');
      }
    },
    [addRelationship, projectId]
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: TableFlowNode[]; edges: RelationshipFlowEdge[] }) => {
      if (nodes.length > 0) {
        setSelectedNode(nodes[0].id);
      } else if (edges.length > 0) {
        setSelectedEdge(edges[0].id);
      } else {
        clearSelection();
      }
    },
    [setSelectedNode, setSelectedEdge, clearSelection]
  );

  // Handle viewport changes
  const handleViewportChange = useCallback(
    (newViewport: typeof viewport) => {
      setViewport(newViewport);
    },
    [setViewport]
  );

  // Save viewport when it stops changing
  const handleMoveEnd = useCallback(() => {
    saveViewportToDb(projectId);
  }, [saveViewportToDb, projectId]);

  // Handle delete key
  const handleNodesDelete = useCallback(
    async (nodesToDelete: TableFlowNode[]) => {
      if (nodesToDelete.length === 0) {
        return;
      }

      const isMultiDelete = nodesToDelete.length > 1;
      const names = nodesToDelete.map((node) => node.data.table.name);
      const confirmed = isMultiDelete
        ? confirm(`Delete ${nodesToDelete.length} tables (${names.join(', ')})?`)
        : confirm(`Delete table "${names[0]}"?`);

      if (!confirmed) {
        return;
      }

      for (const node of nodesToDelete) {
        await deleteTable(node.id);
      }
    },
    [deleteTable]
  );

  const handleEdgesDelete = useCallback(
    async (edgesToDelete: RelationshipFlowEdge[]) => {
      for (const edge of edgesToDelete) {
        await deleteRelationship(edge.id);
      }
    },
    [deleteRelationship]
  );

  return (
    <ReactFlow<TableFlowNode, RelationshipFlowEdge>
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onSelectionChange={handleSelectionChange}
      onMoveEnd={handleMoveEnd}
      onNodesDelete={handleNodesDelete}
      onEdgesDelete={handleEdgesDelete}
      onViewportChange={handleViewportChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      selectionKeyCode="Shift"
      selectionMode={SelectionMode.Partial}
      panOnDrag
      defaultViewport={viewport}
      fitView
      fitViewOptions={{
        padding: 0.2,
        minZoom: 0.5,
        maxZoom: 1.5,
      }}
      minZoom={0.1}
      maxZoom={2}
      deleteKeyCode="Delete"
    >
      <Background color="#e2e8f0" gap={16} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as TableNodeData;
          return data.table?.color || '#3B82F6';
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
      />
      <Panel position="top-left" className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm text-slate-600">
        {tables.length} {tables.length === 1 ? 'table' : 'tables'} · {relationships.length} {relationships.length === 1 ? 'relationship' : 'relationships'}
      </Panel>
    </ReactFlow>
  );
}
