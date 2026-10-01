/**
 * ============================================================================
 * Component: Data Warehouse Schema Viewer (SchemaViewer.tsx)
 * ============================================================================
 */

import React, { useMemo, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background, Controls, Handle, Position, MarkerType, 
  useNodesState, useEdgesState, ReactFlowProvider, getRectOfNodes 
} from 'reactflow';
import { toPng } from 'html-to-image';
import { FileJson, Image as ImageIcon } from 'lucide-react';
import 'reactflow/dist/style.css';

const getTableStyles = (source: string, forcedSource: string) => {
  let src = (forcedSource === 'mdam' || forcedSource === 'base') ? (source || 'base') : forcedSource;
  src = String(src || '').toLowerCase();

  if (src.includes('mdam') || src.includes('merged') || src.includes('base')) {
    return { header: 'bg-green-600 border-green-700', row: 'bg-green-50 border-green-200 text-green-900', dot: 'bg-green-600', label: 'Merged' };
  }
  if (src.includes('rdam') || src.includes('req')) {
    return { header: 'bg-orange-500 border-orange-600', row: 'bg-orange-50 border-orange-200 text-orange-900', dot: 'bg-orange-500', label: 'RDAM' };
  }
  return { header: 'bg-blue-600 border-blue-700', row: 'bg-blue-50 border-blue-200 text-blue-900', dot: 'bg-blue-600', label: 'DDAM' };
};

const TableNode = ({ data }: any) => {
  const tableName = data.tableName || 'Unknown Table';
  const forcedSource = data.forcedSource || 'ddam';
  const s = getTableStyles(data.source, forcedSource);

  // Fallback if data.columns is null or an unexpected object
  const columnsToRender = Array.isArray(data.columns) ? data.columns.filter((c:any) => c !== null) : [];

  return (
    <div className={`rounded-xl border-2 shadow-lg w-64 bg-white overflow-hidden ${data.type === 'fact' ? 'border-slate-800' : 'border-slate-300'}`}>
      <div className={`px-4 py-2 flex justify-between items-center text-white ${s.header}`}>
        <span className="font-bold text-[11px] truncate" title={tableName}>{tableName}</span>
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase font-extrabold opacity-90">{data.type || 'Table'}</span>
          <span className="text-[7px] uppercase font-bold opacity-75 tracking-wider">{s.label}</span>
        </div>
      </div>

      <div className="p-1.5 bg-white text-[10px] font-mono leading-tight space-y-1">
        {columnsToRender.map((col: any, i: number) => {
          const isObj = typeof col === 'object' && col !== null;
          const rawName = isObj ? (col.name || col.attribute || col.column || '') : col;
          const colName = String(rawName || 'Unnamed').trim();
          const colType = isObj ? String(col.type || '').trim() : '';
          const colSource = isObj ? String(col.source || data.source || forcedSource) : String(data.source || forcedSource);
          const rs = getTableStyles(colSource, forcedSource);
          const displayType = colType && colType.toLowerCase() !== 'attribute' ? colType : '';

          const safeType = colType.toUpperCase();
          let isPk = safeType === 'PK' || safeType === 'SK';
          
          if (!safeType || safeType === 'ATTR') {
             const baseName = tableName.replace('dim_', '').replace('fact_', '').toLowerCase();
             if (colName.toLowerCase() === 'id' || colName.toLowerCase() === `${baseName}_id` || colName.toLowerCase() === `${baseName}_sk`) {
                isPk = true;
             } else {
                isPk = false; 
             }
          }

          return (
            <div key={i} className={`flex items-center justify-between px-2 py-1.5 rounded border ${rs.row}`} title={colName}>
              <div className="flex items-center gap-2 truncate">
                 <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPk ? 'bg-yellow-400' : rs.dot}`} />
                 <span className="truncate font-semibold">{colName}</span>
              </div>
              {displayType && <span className="text-[7px] uppercase font-bold opacity-60 ml-2 shrink-0">{displayType}</span>}
            </div>
          );
        })}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

function FlowSchema({ data, defaultSource = 'ddam' }: { data: any, defaultSource?: string }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const dataString = JSON.stringify(data);

  const { initialNodes, initialEdges } = useMemo(() => {
    let tablesArray = [];
    if (data && Array.isArray(data.tables)) tablesArray = data.tables;
    else if (Array.isArray(data)) tablesArray = data;
    
    tablesArray = tablesArray.filter(t => t !== null && typeof t === 'object');
    
    if (tablesArray.length === 0) return { initialNodes: [], initialEdges: [] };

    const rawNodes: any[] = [];
    const rawEdges: any[] = [];
    
    const processedTables = tablesArray.map((t: any) => {
      const tName = t.table_name || t.entity || t.name || 'Unknown_Table';
      let tType = String(t.table_type || t.type || '').toLowerCase();
      if (!tType || tType === 'table') {
         tType = tName.toLowerCase().includes('fact') ? 'fact' : 'dimension';
      }
      
      let cols: any[] = [];
      if (Array.isArray(t.columns)) cols = t.columns;
      else {
         if (t.primary_key) cols.push({ name: t.primary_key, type: 'PK' });
         if (Array.isArray(t.foreign_keys)) cols.push(...t.foreign_keys.filter((k:any) => k !== null).map((k:any) => ({name: k, type: 'FK'})));
         if (Array.isArray(t.metrics)) cols.push(...t.metrics.filter((m:any) => m !== null).map((m:any) => ({name: m, type: 'Metric'})));
         if (Array.isArray(t.attributes)) cols.push(...t.attributes.filter((a:any) => a !== null).map((a:any) => ({name: a, type: 'Attr'})));
      }
      
      return { tName, tType, cols, source: t.source || defaultSource, raw: t };
    });
    
    const factTables = processedTables.filter((t:any) => t.tType.includes('fact'));
    const dimTables = processedTables.filter((t:any) => !t.tType.includes('fact'));

    factTables.forEach((ft:any, i:number) => {
      rawNodes.push({ 
        id: ft.tName, type: 'tableNode', position: { x: 450, y: 150 + (i * 250) }, 
        data: { tableName: ft.tName, type: 'fact', source: ft.source, forcedSource: defaultSource, columns: ft.cols } 
      });
    });

    dimTables.forEach((dt:any, i:number) => {
      const isLeft = i % 2 === 0;
      const yOffset = Math.floor(i / 2) * 180;
      rawNodes.push({ 
        id: dt.tName, type: 'tableNode', position: { x: isLeft ? 50 : 850, y: yOffset + 50 }, 
        data: { tableName: dt.tName, type: 'dimension', source: dt.source, forcedSource: defaultSource, columns: dt.cols } 
      });
    });

    let edgesAdded = 0;
    processedTables.forEach((t: any) => {
      if (t.raw.relations && Array.isArray(t.raw.relations)) {
        t.raw.relations.forEach((rel: any, relIdx: number) => {
          if (!rel) return;
          const targetEntity = rel.to_entity || rel.related_to || rel.table;
          if (targetEntity) {
            rawEdges.push({
              id: `e-${t.tName}-${targetEntity}-${relIdx}`, source: t.tName, target: targetEntity, type: 'straight', animated: true, 
              style: { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.6 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
            });
            edgesAdded++;
          }
        });
      } 
      else if (t.tType === 'fact' && Array.isArray(t.raw.foreign_keys)) {
         t.raw.foreign_keys.forEach((fk: any, fkIdx: number) => {
            if (!fk) return;
            const fkStr = typeof fk === 'string' ? fk : (fk.column || fk.name || String(fk));
            if (!fkStr || typeof fkStr !== 'string') return;
            
            const dimNameMatch = fkStr.replace('_sk', '').replace('_id', '');
            
            const targetDim = processedTables.find(pt => 
               pt.raw.primary_key === fkStr || 
               pt.tName === `dim_${dimNameMatch}` || 
               pt.tName === dimNameMatch
            );
            
            if (targetDim) {
               rawEdges.push({
                 id: `e-${targetDim.tName}-${t.tName}-${fkStr}-${fkIdx}`, source: targetDim.tName, target: t.tName, type: 'straight', animated: true, 
                 style: { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.6 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
               });
               edgesAdded++;
            }
         });
      }
    });

    if (edgesAdded === 0 && factTables.length > 0) {
      dimTables.forEach((dt:any) => {
        factTables.forEach((ft:any) => {
          rawEdges.push({
            id: `e-${dt.tName}-${ft.tName}`, source: dt.tName, target: ft.tName, type: 'straight', animated: true, 
            style: { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
          });
        });
      });
    }

    return { initialNodes: rawNodes, initialEdges: rawEdges };
  }, [dataString, defaultSource]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); setEdges(initialEdges); }, [initialNodes, initialEdges, setNodes, setEdges]);

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
      a.download = 'data_warehouse_schema.png'; 
      a.href = url; 
      a.click(); 
    }).catch(err => {
      console.error('Error exporting PNG:', err);
      alert('Failed to export PNG. Please try again.');
    }); 
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex justify-end gap-2">
        <button onClick={() => { const b = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}); const a = document.createElement('a'); a.download='data_warehouse.json'; a.href=URL.createObjectURL(b); a.click(); }} className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 transition"><FileJson size={14}/> Download JSON</button>
        <button onClick={exportPNG} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs shadow-sm hover:bg-blue-700 transition"><ImageIcon size={14}/> Export PNG</button>
      </div>

      <div className="h-[550px] w-full border border-slate-300 rounded-xl bg-slate-50 overflow-hidden relative shadow-inner" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-4 z-10 bg-white/95 p-3 rounded-xl shadow-md border border-slate-200 pointer-events-none">
          <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">Color Legend</h4>
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div><span className="text-[9px] font-bold text-slate-700">Data-Driven (DDAM)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div><span className="text-[9px] font-bold text-slate-700">Requirements-Driven (RDAM)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-sm"></div><span className="text-[9px] font-bold text-slate-700">Data- and Requirements-Driven</span></div>
          </div>
          <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">Keys</h4>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
            <span className="text-[9px] font-bold text-slate-700">Primary Key (PK)</span>
          </div>
        </div>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView minZoom={0.1}><Background gap={20} color="#cbd5e1" /><Controls /></ReactFlow>
      </div>
    </div>
  );
}

export function SchemaViewer(props: { data: any, defaultSource?: string }) {
  return <ReactFlowProvider><FlowSchema {...props} /></ReactFlowProvider>;
}