import React, { useMemo } from 'react';
import type { Node } from 'reactflow';

interface VirtualizedNodeListProps {
  nodes: Node[];
  renderNode: (node: Node) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
}

export const VirtualizedNodeList: React.FC<VirtualizedNodeListProps> = ({
  nodes,
  renderNode,
  itemHeight,
  containerHeight
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
    const endIndex = Math.min(
      nodes.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, nodes.length]);

  const visibleNodes = useMemo(() => {
    return nodes.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [nodes, visibleRange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: nodes.length * itemHeight,
          position: 'relative'
        }}
      >
        {visibleNodes.map((node, index) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              top: (visibleRange.startIndex + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderNode(node)}
          </div>
        ))}
      </div>
    </div>
  );
};
