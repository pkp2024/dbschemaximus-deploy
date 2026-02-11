import { memo } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Relationship } from '@/types/schema';

interface RelationshipEdgeData {
  relationship: Relationship;
  onDelete?: (relationshipId: string) => void;
}

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdgeData>) {
  const { relationship, onDelete } = data || {};

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#3B82F6' : '#94A3B8',
          strokeWidth: selected ? 3 : 2,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {selected && onDelete && relationship && (
            <Button
              variant="destructive"
              size="icon"
              className="h-6 w-6 rounded-full shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(relationship.id);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          {!selected && relationship && (
            <div className="text-xs bg-white px-2 py-1 rounded shadow-sm border border-slate-200 text-slate-600">
              FK
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
