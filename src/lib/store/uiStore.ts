import { create } from 'zustand';

interface UIStore {
  // State
  isTableEditorOpen: boolean;
  editingTableId: string | null;
  isExportDialogOpen: boolean;
  isImportDialogOpen: boolean;
  isSidebarCollapsed: boolean;
  isPropertiesPanelCollapsed: boolean;

  // Actions
  openTableEditor: (tableId?: string) => void;
  closeTableEditor: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPropertiesPanelCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isTableEditorOpen: false,
  editingTableId: null,
  isExportDialogOpen: false,
  isImportDialogOpen: false,
  isSidebarCollapsed: false,
  isPropertiesPanelCollapsed: false,

  // Actions
  openTableEditor: (tableId?: string) => {
    set({ isTableEditorOpen: true, editingTableId: tableId || null });
  },

  closeTableEditor: () => {
    set({ isTableEditorOpen: false, editingTableId: null });
  },

  openExportDialog: () => {
    set({ isExportDialogOpen: true });
  },

  closeExportDialog: () => {
    set({ isExportDialogOpen: false });
  },

  openImportDialog: () => {
    set({ isImportDialogOpen: true });
  },

  closeImportDialog: () => {
    set({ isImportDialogOpen: false });
  },

  toggleSidebar: () => {
    set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  togglePropertiesPanel: () => {
    set(state => ({ isPropertiesPanelCollapsed: !state.isPropertiesPanelCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
  },

  setPropertiesPanelCollapsed: (collapsed: boolean) => {
    set({ isPropertiesPanelCollapsed: collapsed });
  },
}));
