import { useCallback, useRef } from 'react';
import type { NodeChange } from 'reactflow';

interface DragOptimizationOptions {
  onNodesChange: (changes: NodeChange[]) => void;
  throttleMs?: number;
}

export const useDragOptimization = ({
  onNodesChange,
  throttleMs = 100
}: DragOptimizationOptions) => {
  const lastUpdateRef = useRef<number>(0);
  const pendingChangesRef = useRef<NodeChange[]>([]);
  const isDraggingRef = useRef<boolean>(false);

  const optimizedOnNodesChange = useCallback((changes: NodeChange[]) => {
    const now = Date.now();
    
    // 检测是否在拖拽中
    const hasPositionChange = changes.some(change => change.type === 'position');
    if (hasPositionChange) {
      isDraggingRef.current = true;
    } else {
      isDraggingRef.current = false;
    }

    // 节流处理
    if (now - lastUpdateRef.current < throttleMs) {
      // 累积待处理的变更
      pendingChangesRef.current.push(...changes);
      return;
    }

    // 处理所有待处理的变更
    const allChanges = [...pendingChangesRef.current, ...changes];
    pendingChangesRef.current = [];
    lastUpdateRef.current = now;

    // 批量处理变更
    onNodesChange(allChanges);
  }, [onNodesChange, throttleMs]);

  return {
    onNodesChange: optimizedOnNodesChange,
    isDragging: () => isDraggingRef.current,
    clearPending: () => {
      pendingChangesRef.current = [];
    }
  };
};
