'use client';

import { useReactFlow } from '@xyflow/react';
import ExportDialog from './ExportDialog';

interface ExportDialogWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export default function ExportDialogWrapper(props: ExportDialogWrapperProps) {
  const { getNodes } = useReactFlow();
  const nodes = getNodes();

  return <ExportDialog {...props} nodes={nodes} />;
}
