import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useStoreApi,
} from 'reactflow';
import type { Connection, Node, Edge, NodeChange } from 'reactflow';
import 'reactflow/dist/style.css';
import NetworkDeviceNode from './NetworkDeviceNode';
import useNetworkStore from '../store/networkStore';
import useConfigStore from '../store/configStore';
import useTheme from '../hooks/useTheme';
import type { NetworkDevice } from '../../types';

const nodeTypes = {
  networkDevice: NetworkDeviceNode,
};

const NetworkCanvas: React.FC = () => {
  const { devices, connections, updateDevice, addConnection, deleteConnection } = useNetworkStore();
  const { showMiniMap, showControls, showBackground, lockCanvas, toggleCanvasLock } = useConfigStore();
  const currentTheme = useTheme();
  
  // State for right-click menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    edge: Edge | null;
    hovered: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    edge: null,
    hovered: false,
  });

  // Convert our network devices to ReactFlow nodes (memoized)
  const nodes: Node<NetworkDevice>[] = useMemo(
    () => (devices || []).map((device) => ({
      id: device.id,
      type: 'networkDevice',
      position: { x: device.x, y: device.y },
      data: device,
    })),
    [devices]
  );

  // Convert our connections to ReactFlow edges (memoized)
  const edges: Edge[] = useMemo(() => (connections || []).map((conn) => {
    // Calculate line rate based on minimum port rate of both ends
    const sourceDevice = (devices || []).find(d => d.id === conn.source);
    const targetDevice = (devices || []).find(d => d.id === conn.target);
    
    let lineRate = 100; // Default rate if devices or ports not found
    
    if (sourceDevice && targetDevice) {
      const sourcePort = (sourceDevice.ports || []).find(p => p.id === conn.sourcePort);
      const targetPort = (targetDevice.ports || []).find(p => p.id === conn.targetPort);
      
      if (sourcePort && targetPort) {
        // Line rate is the minimum of the two port rates
        lineRate = Math.min(sourcePort.rate, targetPort.rate);
      }
    }
    
    // Determine edge color based on device status
    let edgeColor = conn.status === 'up' ? '#52c41a' : conn.status === 'warning' ? '#faad14' : '#ff4d4f';
    
    // Check if any connected device is down or unknown
    if (sourceDevice?.status === 'down' || targetDevice?.status === 'down') {
      edgeColor = '#ff4d4f'; // Red for down devices
    } else if (sourceDevice?.status === 'unknown' || targetDevice?.status === 'unknown') {
      edgeColor = '#faad14'; // Yellow for unknown devices
    }
    
    return {
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourcePort,
      targetHandle: conn.targetPort,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: edgeColor,
        strokeWidth: 2,
        boxShadow: '0 0 0 0 transparent',
        transition: 'all 0.2s ease',
      },
      label: `${lineRate === 1000 ? '1 Gbps' : 
              lineRate === 10000 ? '10 Gbps' : 
              lineRate === 2500 ? '2.5 Gbps' : 
              `${lineRate} Mbps`}`, 
      labelStyle: {
        fontSize: '10px',
        backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
        padding: '2px 4px',
        borderRadius: '4px',
        border: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#e0e0e0'}`,
        boxShadow: currentTheme === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      // Add interactivity options
      selectable: true,
      deletable: true,
      // Add hover effect
      defaultInteractionMode: 'select',
    };
  }), [connections, devices, currentTheme]);

  // Handle edge creation with duplicate check
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        // Extract real port IDs from handle IDs (remove -left-/-right- prefix and -source/-target suffix)
        const sourcePortId = params.sourceHandle.replace(/-left-|-right-|-source|-target/g, '');
        const targetPortId = params.targetHandle.replace(/-left-|-right-|-source|-target/g, '');
        
        // Check for duplicate connections
        const isDuplicate = connections.some(conn => 
          // Check both directions since connections are bidirectional
          (conn.source === params.source && 
           conn.target === params.target && 
           conn.sourcePort === sourcePortId && 
           conn.targetPort === targetPortId) ||
          (conn.source === params.target && 
           conn.target === params.source && 
           conn.sourcePort === targetPortId && 
           conn.targetPort === sourcePortId)
        );
        
        if (!isDuplicate) {
          // Create a new connection with port information
          const newConnection = {
            source: params.source,
            target: params.target,
            sourcePort: sourcePortId,
            targetPort: targetPortId,
            status: 'up' as const,
            traffic: Math.random() * 1000, // Random initial traffic
          };
          
          addConnection(newConnection);
        } else {
          console.log('Duplicate connection detected, skipping creation');
        }
      }
    },
    [addConnection, connections]
  );

  // Handle node changes (including position updates when dragging)
  // Use ref-based throttle to avoid recreating throttle on every render
  const throttleTimerRef = useRef<boolean>(false);
  const devicesRef = useRef(devices);
  const updateDeviceRef = useRef(updateDevice);
  devicesRef.current = devices;
  updateDeviceRef.current = updateDevice;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (throttleTimerRef.current) return;
      throttleTimerRef.current = true;
      setTimeout(() => { throttleTimerRef.current = false; }, 100);

      changes.forEach((change) => {
        if (change.type === 'position') {
          const device = (devicesRef.current || []).find((d) => d.id === change.id);
          if (device && change.position) {
            updateDeviceRef.current({
              ...device,
              x: change.position.x,
              y: change.position.y,
            });
          }
        }
      });
    },
    [] // stable — uses refs
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edges: Edge[]) => {
      edges.forEach((edge) => {
        deleteConnection(edge.id);
      });
    },
    [deleteConnection]
  );

  // Handle context menu (right-click) on edges
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        edge,
        hovered: false,
      });
    },
    []
  );

  // Handle close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      edge: null,
      hovered: false,
    });
  }, []);

  // Handle delete connection from context menu
  const handleDeleteConnection = useCallback(() => {
    if (contextMenu.edge) {
      deleteConnection(contextMenu.edge.id);
      closeContextMenu();
    }
  }, [contextMenu.edge, deleteConnection, closeContextMenu]);

  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('contextmenu', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [contextMenu.visible, closeContextMenu]);



  // Get ReactFlow store API and current interactive state
  const storeApi = useStoreApi();
  
  // Sync lockCanvas state with ReactFlow internal interactivity state
  useEffect(() => {
    // When lockCanvas changes, update ReactFlow's internal state
    // This ensures the built-in toggle interactivity button shows the correct state
    storeApi.setState({
      nodesDraggable: !lockCanvas,
      nodesConnectable: !lockCanvas,
      elementsSelectable: !lockCanvas,
    });
  }, [lockCanvas, storeApi]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', touchAction: 'none' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onNodesChange={onNodesChange}
      onEdgesDelete={onEdgesDelete}
      onEdgeContextMenu={onEdgeContextMenu}
      fitView
      // Enhanced interaction settings
      snapToGrid
      snapGrid={[10, 10]}
      minZoom={0.1}
      maxZoom={4}
      // Control interaction based on lockCanvas state
      panOnDrag={!lockCanvas}
      zoomOnScroll={!lockCanvas}
      zoomOnDoubleClick={!lockCanvas}
      selectNodesOnDrag={!lockCanvas}
      deleteKeyCode={['Backspace', 'Delete']}
      defaultEdgeOptions={{
        animated: true,
        type: 'smoothstep',
        style: {
          strokeWidth: 2,
          stroke: '#52c41a',
          transition: 'all 0.2s ease',
        },
      }}
      // Enable edge selection
      multiSelectionKeyCode={['Meta', 'Control']}
      // Canvas interaction control
      nodesDraggable={!lockCanvas}
      nodesConnectable={!lockCanvas}
      // Performance optimization settings
      onlyRenderVisibleElements={true}
      // Mobile compatibility
      panOnScroll={false}
      // Selection on drag behavior based on canvas lock state
      selectionOnDrag={!lockCanvas}
      // Style
      style={{
        backgroundColor: currentTheme === 'dark' ? '#051221' : '#ffffff',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
      // Additional performance optimizations
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={false}
      fitViewOptions={{ padding: 0.2, minZoom: 0.1, maxZoom: 4 }}
      proOptions={{ hideAttribution: true }}
    >
      {showControls && <Controls 
        style={{ backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff', border: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#e0e0e0'}` }} 
        onInteractiveChange={() => toggleCanvasLock()} 
      />}
      {showMiniMap && (
        <MiniMap
          nodeStrokeColor={(n) => {
            const device = (devices || []).find((d) => d.id === n.id);
            return device?.status === 'up' ? '#52c41a' : device?.status === 'warning' ? '#faad14' : '#ff4d4f';
          }}
          nodeColor={(n) => {
            const device = (devices || []).find((d) => d.id === n.id);
            switch (device?.type) {
              case 'router':
                return '#1890ff';
              case 'switch':
                return '#52c41a';
              case 'server':
                return '#faad14';
              case 'wireless_router':
                return '#722ed1';
              case 'ap':
                return '#eb2f96';
              case 'optical_modem':
                return '#1890ff';
              default:
                return '#faad14';
            }
          }}
          nodeBorderRadius={10}
          style={{ backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff', border: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#e0e0e0'}` }}
        />
      )}
      {showBackground && <Background color={currentTheme === 'dark' ? '#1f3a5f' : '#aaa'} gap={16} className={currentTheme === 'dark' ? 'dark' : ''} />}
      
      {/* Empty state message when no devices */}
      {(devices || []).length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: currentTheme === 'dark' ? '#a0b1c5' : '#666666',
          zIndex: 10,
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>
            暂无设备
          </h3>
          <p style={{ margin: '0', fontSize: '14px' }}>
            请从左侧菜单添加设备，开始构建您的网络拓扑
          </p>
        </div>
      )}
    </ReactFlow>
    
    {/* Context Menu */}
    {contextMenu.visible && contextMenu.edge && (
      <div
        style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          borderRadius: '4px',
          boxShadow: currentTheme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
          border: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#d9d9d9'}`,
          zIndex: 1000,
          minWidth: '120px',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            borderBottom: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#f0f0f0'}`,
            backgroundColor: contextMenu.hovered ? (currentTheme === 'dark' ? '#18304a' : '#f5f5f5') : 'transparent',
            transition: 'background-color 0.2s ease',
          }}
          onClick={handleDeleteConnection}
          onMouseEnter={() => setContextMenu(prev => ({ ...prev, hovered: true }))}
          onMouseLeave={() => setContextMenu(prev => ({ ...prev, hovered: false }))}
        >
          删除连接
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

const MemoizedNetworkCanvas = React.memo(NetworkCanvas);

export default MemoizedNetworkCanvas;