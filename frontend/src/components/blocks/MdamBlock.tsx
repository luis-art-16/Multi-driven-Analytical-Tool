/**
 * ============================================================================
 * Component: Multi-Driven Analytical Model Block (MdamBlock.tsx)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Check, Play, Edit3, Send } from 'lucide-react';
import { apiClient } from '../../api/client';
import { SchemaViewer } from '../SchemaViewer';

export default function MdamBlock({ onNext }: { onNext: () => void }) {
  const { completeStep, invalidateFrom, sharedData } = usePipelineStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(sharedData.finalDw);
  useEffect(() => {
    setResult(sharedData?.finalDw || null);
  }, [sharedData?.finalDw]);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (isRefinement = false) => {
    invalidateFrom('mdam');
    setLoading(true); setError('');
    try {
      const payload = isRefinement 
        ? { ddam_model: `Current Model: ${JSON.stringify(result)}. Refine with: ${refineText}`, rdam_model: "", temperature: 0.1 }
        : { ddam_model: sharedData.ddamDw, rdam_model: sharedData.rdamDw, temperature: 0.1 };

      const res = await apiClient.post('/mdam/generate', payload);
      
      let schemaObj = res.data?.final_dw_schema || res.data;
      if (!schemaObj?.tables) throw new Error("A IA não gerou tabelas válidas no modelo MDAM.");

      const coloredData = {
        ...schemaObj,
        tables: schemaObj.tables.map((t: any) => {
          
          const resolvedName = t.table_name || t.name || "Unknown_Table";
          const tableSource = t.source || 'base';

          // STEP 1: EXTRACT COLUMNS BEFORE EVALUATING THE TYPE
          let rawColumns = [];
          if (Array.isArray(t.columns) && t.columns.length > 0) {
              rawColumns = t.columns;
          } else {
              rawColumns = [
                ...(typeof t.primary_key === 'string' ? [{ name: t.primary_key, type: 'PK', source: tableSource }] : []),
                ...(Array.isArray(t.foreign_keys) ? t.foreign_keys.map((fk: any) => typeof fk === 'string' ? { name: fk, type: 'FK', source: tableSource } : fk) : []),
                ...(Array.isArray(t.attributes) ? t.attributes.map((a: any) => typeof a === 'string' ? { name: a, type: 'ATTR', source: tableSource } : a) : []),
                ...(Array.isArray(t.metrics) ? t.metrics.map((m: any) => typeof m === 'string' ? { name: m, type: 'METRIC', source: tableSource } : m) : [])
              ];
          }

          // STEP 2: INTELLECTUAL DETECTION BASED ON EXTRACTED COLUMNS
          const hasMetrics = rawColumns.some((c: any) => c.type === 'METRIC');
          const isFact = resolvedName.toLowerCase().includes('fact') || hasMetrics;
          const resolvedType = t.table_type || t.type || (isFact ? 'fact' : 'dimension');

          return {
            ...t,
            table_name: resolvedName,
            table_type: resolvedType,
            source: tableSource,
            columns: rawColumns.map((f: any) => {
              let fieldName = "Unnamed_Field";
              let fieldSource = f.source || tableSource;
              let fieldType = f.type || '';
              
              if (typeof f === 'string' && f.trim() !== '') {
                fieldName = f;
              } else if (f && typeof f === 'object') {
                const keys = Object.keys(f);
                const exactNameKey = keys.find(k => 
                  ['name', 'column_name', 'attribute_name', 'metric_name', 'metric', 'attribute', 'column', 'id'].includes(k.toLowerCase()) 
                  && typeof f[k] === 'string' 
                  && f[k].trim() !== ''
                );
                
                if (exactNameKey) fieldName = f[exactNameKey];
                else {
                  const fallback = keys.find(k => 
                    !['type', 'data_type', 'description', 'source'].includes(k.toLowerCase()) 
                    && typeof f[k] === 'string' && f[k].trim() !== ''
                  );
                  if (fallback) fieldName = f[fallback];
                }
              }
              
              return typeof f === 'string' 
                ? { name: String(fieldName).trim(), type: fieldType, source: fieldSource }
                : { ...f, name: String(fieldName).trim(), type: fieldType, source: fieldSource };
            }).filter((c: any, index: number, self: any[]) => 
              c.name !== "Unnamed_Field" && index === self.findIndex((col) => col.name === c.name)
            )
          };
        })
      };

      setResult(coloredData);
      if (isRefinement) setRefineText('');
    } catch (err: any) { 
      setError("Error merging MDAM models."); 
      console.error(err);
    } 
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">5. Multi-Driven Analytical Model (MDAM)</h2>
      <p className="text-slate-600 mb-6">Integrate the DDAM and the RDAM into a consolidated model.</p>

      {!result && (
        <button onClick={() => handleGenerate()} disabled={loading} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2">
          <Play size={18} /> {loading ? 'Merging models...' : 'Integrate DWs models'}
        </button>
      )}

      {error && <div className="text-red-500 mt-4 font-bold border border-red-200 bg-red-50 p-4 rounded-lg">{error}</div>}

      {result && (
        <div className="mt-6 space-y-6">
          {/* Added mb-12 for margin and overflow-hidden/rounded-xl/border to SchemaViewer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="col-span-2 h-[550px] relative z-0 overflow-hidden rounded-xl border border-slate-300">
              <SchemaViewer data={result} defaultSource="base" />
            </div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-y-auto h-[550px]">
               <pre className="text-indigo-400 text-xs font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
          
          {/* MDAM Mapping Table */}
          <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Analytical Data Mapping Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-3 rounded-tl-lg font-semibold">Target Entity / Table</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Source</th>
                    <th className="p-3 font-semibold">Metrics (Indicators)</th>
                    <th className="p-3 rounded-tr-lg font-semibold">Attributes / Dimensions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tables?.map((t: any, i: number) => {
                    const metrics = t.columns?.filter((c: any) => c.type === 'METRIC').map((c: any) => c.name) || [];
                    const attributes = t.columns?.filter((c: any) => c.type !== 'METRIC').map((c: any) => c.name) || [];
                    
                    return (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-indigo-700">{t.table_name}</td>
                        <td className="p-3">
                          <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                            {t.table_type || 'dimension'}
                          </span>
                        </td>
                        <td className="p-3 uppercase text-xs font-semibold text-slate-500">
                        {(!t.source || t.source.toLowerCase() === 'base') ? 'DDAM & RDAM' : t.source}
                        </td>
                        <td className="p-3 text-red-600 font-medium">{metrics.length > 0 ? metrics.join(', ') : '-'}</td>
                        <td className="p-3 text-slate-600">{attributes.length > 0 ? attributes.join(', ') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-xl flex gap-3">
            <Edit3 className="text-indigo-500 mt-2" />
            <input 
              type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} 
              placeholder="Refine merge..." className="flex-1 p-2.5 border rounded-lg text-sm" disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)}
            />
            <button onClick={() => handleGenerate(true)} disabled={loading || !refineText} className="bg-indigo-600 text-white px-6 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
              <Send size={16} /> Refine
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t">
             <button onClick={() => { completeStep('mdam', result); onNext(); }} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex gap-2">
               <Check size={20} /> Approve MDAM
             </button>
          </div>
        </div>
      )}
    </div>
  );
}