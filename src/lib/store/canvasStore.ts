import { create } from 'zustand';
import type { Viewport } from '@xyflow/react';
import * as dbOps from '@/lib/data/operations';

interface CanvasStore {
  // State
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewport: Viewport;

  // Actions
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  setViewport: (viewport: Viewport) => void;
  saveViewportToDb: (projectId: string) => Promise<void>;
  loadViewportFromDb: (projectId: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  selectedNodeId: null,
  selectedEdgeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },

  // Actions
  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  setSelectedEdge: (edgeId: string | null) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },

  saveViewportToDb: async (projectId: string) => {
    const { viewport } = get();
    await dbOps.saveCanvasState({
      projectId,
      zoom: viewport.zoom,
      offsetX: viewport.x,
      offsetY: viewport.y,
      updatedAt: Date.now(),
    });
  },

  loadViewportFromDb: async (projectId: string) => {
    const canvasState = await dbOps.getCanvasState(projectId);
    if (canvasState) {
      set({
        viewport: {
          x: canvasState.offsetX,
          y: canvasState.offsetY,
          zoom: canvasState.zoom,
        },
      });
    }
  },
}));
