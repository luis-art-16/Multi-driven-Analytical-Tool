/**
 * ============================================================================
 * Component: i* Framework Diagram Viewer (DiagramViewer.tsx)
 * Description: 
 * A highly customized ReactFlow canvas for rendering Goal-Oriented 
 * Requirement Engineering (GORE) models using the i* framework. 
 * Features dynamic Dagre auto-layout algorithms, custom SVG node shapes 
 * (Actors, Goals, Softgoals, Tasks), and dynamic color-coding 
 * based on MoSCoW prioritization metrics.
 * ============================================================================
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import ReactFlow, { 
  Background, Controls, Handle, Position, MarkerType, 
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, Node, Edge,
  getRectOfNodes
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { FileJson, Image as ImageIcon, ExternalLink, Edit } from 'lucide-react';
import { toPng } from 'html-to-image';

// FUNCTION TO DETERMINE MoSCoW COLORS
const getPriorityStyles = (priority: string) => {
  const p = (priority || '').toLowerCase();
  if (p.includes('must')) return { border: 'border-red-500', bg: 'bg-red-50', text: '#991b1b', stroke: '#ef4444', fill: '#fef2f2', badge: 'bg-red-200 text-red-800' };
  if (p.includes('should')) return { border: 'border-orange-500', bg: 'bg-orange-50', text: '#9a3412', stroke: '#f97316', fill: '#fff7ed', badge: 'bg-orange-200 text-orange-800' };
  if (p.includes('could')) return { border: 'border-green-500', bg: 'bg-green-50', text: '#166534', stroke: '#22c55e', fill: '#f0fdf4', badge: 'bg-green-200 text-green-800' };
  return { border: 'border-slate-400', bg: 'bg-slate-50', text: '#334155', stroke: '#94a3b8', fill: '#f8fafc', badge: 'bg-slate-200 text-slate-700' }; // Default
};

// 1. DEFINITION OF DYNAMIC NODES
const nodeTypes = {
  actor: ({ data }: any) => (
    <div className="w-24 h-24 bg-slate-50 border-[3px] border-slate-500 rounded-full flex flex-col items-center justify-center shadow-md relative z-20 cursor-grab mt-8">
      <div className="absolute -top-7 bg-white border-[3px] border-slate-500 rounded-full w-8 h-8 flex items-center justify-center shadow-sm z-30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="12" y1="16" x2="6" y2="22"></line>
          <line x1="12" y1="16" x2="18" y2="22"></line>
          <line x1="6" y1="10" x2="18" y2="10"></line>
        </svg>
      </div>
      <span className="font-bold text-[11px] text-slate-800 text-center px-2">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
    </div>
  ),
  goal: ({ data }: any) => {
    const s = getPriorityStyles(data.priority);
    return (
      <div className={`px-4 py-2 ${s.bg} border-[3px] ${s.border} shadow-md min-w-[160px] min-h-[90px] flex flex-col items-center justify-center z-10 cursor-grab`} style={{ borderRadius: '50%' }}>
        <span className="font-bold text-[11px] text-center leading-tight whitespace-normal break-words" style={{color: s.text}}>{data.label}</span>
        <span className={`mt-1.5 text-[8px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest shadow-sm ${s.badge}`}>{data.rawType}</span>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
        <Handle type="target" position={Position.Top} className="opacity-0" />
      </div>
    );
  },
  task: ({ data }: any) => {
    const s = getPriorityStyles(data.priority);
    return (
      <div className={`px-6 py-3 ${s.bg} border-[3px] ${s.border} shadow-md min-w-[150px] min-h-[60px] flex flex-col items-center justify-center z-10 cursor-grab`} style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)' }}>
        <span className="font-bold text-[11px] text-center leading-tight whitespace-normal break-words" style={{color: s.text}}>{data.label}</span>
        <span className={`mt-1.5 text-[8px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest shadow-sm ${s.badge}`}>{data.rawType}</span>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
        <Handle type="target" position={Position.Top} className="opacity-0" />
      </div>
    );
  }
};

// 2. FUNCTION FOR AUTO-LAYOUT (Dagre)
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // Increased ranksep to provide more vertical space for the hierarchical tree
  dagreGraph.setGraph({ rankdir: direction, ranksep: 110, nodesep: 120 });

  nodes.forEach((node) => { dagreGraph.setNode(node.id, { width: 160, height: 90 }); });
  edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - 80, y: nodeWithPosition.y - 45 },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

function FlowContent({ data, onUpdateData }: { data: any, onUpdateData?: (d: any) => void }) {
  const { fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const dataString = JSON.stringify(data);

  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    
    if (!data || !data.actors) return { initialNodes: rawNodes, initialEdges: rawEdges };

    // 1. Create Nodes for Actors
    data.actors.forEach((actor: any) => {
      rawNodes.push({
        id: actor.name || actor.id,
        type: 'actor',
        position: { x: 0, y: 0 },
        data: { label: actor.name }
      });
    });

    // Mapping: Associate the text ("dependum") with the node ID
    const dependumToId: Record<string, string> = {};

    // 2. Create Nodes for Goals and Tasks
    data.dependencies?.forEach((dep: any, index: number) => {
      const resId = `dep-node-${index}`;
      
      if (dep.dependum) {
        dependumToId[dep.dependum.toLowerCase().trim()] = resId;
      }
      
      let nodeType = 'goal'; 
      const typeStr = dep.type?.toLowerCase() || '';
      if (typeStr.includes('task')) nodeType = 'task';
      
      rawNodes.push({
        id: resId,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: { 
          label: dep.dependum, 
          rawType: dep.type || 'Goal',
          priority: dep.priority || '' 
        }
      });
    });

    // 3. Draw the Arrows (Edges) Respecting the Hierarchy
    let lastSeenSG: string | null = null;
    let lastSeenDG: string | null = null;
    let lastSeenIG: string | null = null;

    data.dependencies?.forEach((dep: any, index: number) => {
      const resId = `dep-node-${index}`;
      const typeStr = dep.type?.toLowerCase() || '';

      // Update the hierarchy trail (crucial for models imported without the 'parent' field)
      if (typeStr.includes('strategic')) { lastSeenSG = resId; lastSeenDG = null; lastSeenIG = null; }
      else if (typeStr.includes('decision')) { lastSeenDG = resId; lastSeenIG = null; }
      else if (typeStr.includes('information')) { lastSeenIG = resId; }

      const parentKey = dep.parent ? String(dep.parent).toLowerCase().trim() : null;
      let parentId = parentKey ? dependumToId[parentKey] : null;

     // HEURISTIC BACKWARD COMPATIBILITY LOGIC: If the JSON lacks a 'parent', we infer the tree structure.
      if (!parentId) {
         if (typeStr.includes('decision')) parentId = lastSeenSG;
         else if (typeStr.includes('information')) parentId = lastSeenDG;
         else if (typeStr.includes('task')) parentId = lastSeenIG;
      }

      if (parentId) {
        // Links strictly from Parent to Child (Ensures the cascading effect: SG -> DG -> IG -> Task)
        rawEdges.push({
          id: `edge-parent-${index}`,
          source: parentId,
          target: resId,
          animated: true,
          style: { stroke: '#475569', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
        });
      } else {
        // If it's the top of the pyramid (Strategic Goal), we only connect it to the Main Actor (depender).
        if (dep.depender) {
          rawEdges.push({ 
            id: `edge-depender-${index}`, 
            source: dep.depender, 
            target: resId, 
            animated: true, 
            style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' }, 
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
          });
        }
      }
    });

    const { layoutedNodes, layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [dataString]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { 
    setNodes(initialNodes); 
    setEdges(initialEdges); 
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100); 
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const exportPNG = () => {
    if (!reactFlowWrapper.current) return;
    const el = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
    
    const nodesBounds = getRectOfNodes(nodes); 
  
    const margin = 200; 
    const width = nodesBounds.width + margin * 2;
    const height = nodesBounds.height + margin * 2;

    const translateX = Math.round(-nodesBounds.x + margin);
    const translateY = Math.round(-nodesBounds.y + margin);

    toPng(el, { 
      backgroundColor: '#f8fafc',
      width: width,
      height: height,
      pixelRatio: 3,
      cacheBust: true,
      skipFonts: false,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transformOrigin: 'top left',
        transform: `translate(${translateX}px, ${translateY}px) scale(1)`
      }
    }).then(url => { 
      const a = document.createElement('a'); 
      a.download = 'istar_model.png'; 
      a.href = url; 
      a.click(); 
    }).catch(err => {
      console.error('Error exporting PNG:', err);
      alert('Failed to export PNG. Please try again.');
    }); 
  };

  return (
    <div className="space-y-3 relative w-full">
      <div className="flex justify-end gap-2">
        {onUpdateData && <button onClick={() => {setJsonText(JSON.stringify(data, null, 2)); setIsEditing(true);}} className="flex items-center gap-1 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-black transition-colors"><Edit size={14}/> Edit JSON</button>}
        
        <button onClick={() => { const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}); const a = document.createElement('a'); a.download='istar_model.json'; a.href=URL.createObjectURL(b); a.click(); }} className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors"><FileJson size={14}/> Download JSON</button>
        
        <button onClick={() => {
          const piStar = {
            "project": { "name": "RSR Export", "models": [{
              "type": "istar.SDModel",
              "nodes": data.actors?.map((a: any) => ({ "id": a.id || a.name, "text": a.name, "type": "istar.Role" })) || [],
              "links": data.dependencies?.map((d: any, i: number) => ({ "id": `l${i}`, "type": "istar.DependencyLink", "source": d.depender, "target": d.dependee })) || []
            }]}
          };
          const blob = new Blob([JSON.stringify(piStar)], { type: 'application/json' });
          const a = document.createElement('a'); a.download = 'model.jstar'; a.href = URL.createObjectURL(blob); a.click();
        }} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700 transition-colors"><ExternalLink size={14}/> Export piStar</button>
        
        <button onClick={exportPNG} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition-colors"><ImageIcon size={14}/> Export PNG</button>
      </div>
      
      <div className="h-[550px] border border-slate-300 rounded-xl overflow-hidden bg-[#f8fafc] shadow-inner relative" ref={reactFlowWrapper}>
        
        <div className="absolute top-4 left-4 z-10 bg-white/95 p-4 rounded-xl shadow-md border border-slate-200 pointer-events-none">
          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">i* Model Shapes</h4>
          {/* Updated Caption: "Resource" Removed */}
          <div className="flex flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-slate-400 bg-slate-100"></div><span className="text-[10px] font-bold text-slate-700">Actor</span></div>
            <div className="flex items-center gap-2"><div className="w-6 h-4 rounded-[50%] border-2 border-slate-400 bg-slate-100"></div><span className="text-[10px] font-bold text-slate-700">Goals (SG, DG, IG)</span></div>
            <div className="flex items-center gap-2"><div className="w-5 h-4 border-2 border-slate-400 bg-slate-100" style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)' }}></div><span className="text-[10px] font-bold text-slate-700">Task</span></div>
          </div>
          
          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1 mt-4">MoSCoW Priorities</h4>
          <div className="flex flex-col gap-1.5 mb-1">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-700">Must have</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-700">Should have</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-700">Could have</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full"></div><span className="text-[10px] font-bold text-slate-700">None (Optional)</span></div>
          </div>
        </div>

        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView minZoom={0.1} maxZoom={2}>
          <Background gap={24} size={1.5} color="#cbd5e1" />
          <Controls />
        </ReactFlow>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-4 rounded-xl shadow-2xl w-3/4 h-3/4 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-2">Edit Raw JSON</h3>
            <textarea className="flex-1 p-4 border border-slate-300 rounded-lg font-mono text-xs bg-slate-50 outline-none" value={jsonText} onChange={e => setJsonText(e.target.value)} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={() => { try { onUpdateData?.(JSON.parse(jsonText)); setIsEditing(false); } catch { alert("Invalid JSON!"); } }} className="px-6 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagramViewer(props: { data: any, onUpdateData?: (d: any) => void }) {
  return <ReactFlowProvider><FlowContent {...props} /></ReactFlowProvider>;
}