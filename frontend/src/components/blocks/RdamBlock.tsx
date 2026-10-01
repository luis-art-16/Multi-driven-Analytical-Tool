/**
 * ============================================================================
 * Component: Requirements-Driven Analytical Model Block (RdamBlock.tsx)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Check, Play, Edit3, Send, Users, AlertTriangle, Database } from 'lucide-react';
import { apiClient } from '../../api/client';
import { SchemaViewer } from '../SchemaViewer';

export default function RdamBlock({ onNext }: { onNext?: () => void }) {
  const { completeStep, invalidateFrom, sharedData } = usePipelineStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(sharedData.rdamDw);
  useEffect(() => {
    setResult(sharedData?.rdamDw || null);
  }, [sharedData?.rdamDw]);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState('');

  const istarData = sharedData.istarModel || sharedData.rsr || sharedData.istar;

  const handleGenerate = async (isRefinement = false) => {
    invalidateFrom('rdam');
    setLoading(true); 
    setError('');
    
    if (!isRefinement && !istarData) {
      setError("Missing i* Model Data: Please go back to Step 2 (RSR) and upload the requirements.");
      setLoading(false);
      return;
    }

    try {
      const payload = isRefinement 
        ? { der_model: JSON.stringify(result), istar_model: "", refinement_instruction: refineText }
        : { 
            der_model: sharedData.derJson ? sharedData.derJson : {}, 
            istar_model: istarData, 
            temperature: 0.2 
          };

      const res = await apiClient.post('/rdam/generate', payload);
      
      let schemaObj = res.data?.dw_schema || res.data;
      if (!schemaObj?.tables) throw new Error("The AI ​​did not generate valid tables.");

      const coloredData = {
        ...schemaObj,
        tables: schemaObj.tables.map((t: any) => {
          const resolvedName = t.table_name || t.name || "Unknown_Table";
          const isFact = resolvedName.toLowerCase().includes('fact');
          const resolvedType = t.table_type || t.type || (isFact ? 'fact' : 'dimension');

          const rawFields = [
            ...(typeof t.primary_key === 'string' ? [{ name: t.primary_key, type: 'PK' }] : []),
            ...(Array.isArray(t.foreign_keys) ? t.foreign_keys.map((fk: any) => typeof fk === 'string' ? { name: fk, type: 'FK' } : { name: fk.column || fk.name, type: 'FK' }) : []),
            ...(Array.isArray(t.attributes) ? t.attributes.map((a: any) => typeof a === 'string' ? { name: a, type: 'ATTR' } : a) : []),
            ...(Array.isArray(t.metrics) ? t.metrics.map((m: any) => typeof m === 'string' ? { name: m, type: 'METRIC' } : m) : []),
            ...(Array.isArray(t.columns) ? t.columns : [])
          ];

          return {
            ...t,
            table_name: resolvedName,
            table_type: resolvedType,
            source: 'rdam',
            columns: rawFields.map((f: any) => {
              let fieldName = "Unnamed_Field";
              if (typeof f === 'string' && f.trim() !== '') {
                fieldName = f;
              } else if (f && typeof f === 'object') {
                const keys = Object.keys(f);
                const exactNameKey = keys.find(k => ['name', 'column_name', 'attribute_name', 'metric_name', 'metric', 'attribute', 'column', 'id'].includes(k.toLowerCase()) && typeof f[k] === 'string' && f[k].trim() !== '');
                if (exactNameKey) fieldName = f[exactNameKey];
                else {
                  const fallback = keys.find(k => !['type', 'data_type', 'description', 'source'].includes(k.toLowerCase()) && typeof f[k] === 'string' && f[k].trim() !== '');
                  if (fallback) fieldName = f[fallback];
                }
              }
              return typeof f === 'string' ? { name: String(fieldName).trim(), source: 'rdam' } : { ...f, name: String(fieldName).trim(), source: 'rdam' };
            }).filter((c: any, index: number, self: any[]) => c.name !== "Unnamed_Field" && index === self.findIndex((col) => col.name === c.name))
          };
        })
      };

      setResult(coloredData);
      setRefineText('');
    } catch (err: any) { 
      const errorMsg = err.response?.data?.detail ? (typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail)) : (err.message || "Error generating RDAM.");
      setError(errorMsg);
    } finally { 
      setLoading(false); 
    }
  };

 // UNIVERSAL DATE GAP NORMALIZER (Enforces 4 strict columns)
  let dataGaps = result?.data_gaps || [];
  if (!Array.isArray(dataGaps)) dataGaps = [];
  
  const normalizedGaps = dataGaps.map((gap: any, index: number) => {
    if (typeof gap !== 'object' || gap === null) return null;
    
    const keys = Object.keys(gap);
    const getVal = (keywords: string[]) => {
       const foundKey = keys.find(k => keywords.some(w => k.toLowerCase().includes(w)));
       return foundKey ? gap[foundKey] : null;
    };

    const idVal = getVal(['id', 'gap_id', 'code']) || `GAP-${index + 1}`;
    const descVal = getVal(['description', 'issue', 'problem', 'gap']) || '-';
    const impactVal = getVal(['impact', 'consequence', 'effect']) || 'Not specified';
    
    let mitVal = getVal(['mitigation', 'recommendation', 'solution', 'strategy', 'action', 'fix']);
    
    if (!mitVal) {
        const usedKeys = keys.filter(k => gap[k] === idVal || gap[k] === descVal || gap[k] === impactVal);
        const leftoverKey = keys.find(k => !usedKeys.includes(k));
        if (leftoverKey) mitVal = gap[leftoverKey];
        else mitVal = 'N/A';
    }

    return { id: idVal, description: descVal, impact: impactVal, mitigation: mitVal };
  }).filter(Boolean);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">4. Requirements-Driven Analytical Model (RDAM)</h2>
      <p className="text-slate-600 mb-6">Use the ERD and the i* model to propose a Data Warehouse focused on the user requirements.</p>

      {!result && (
        <div className="space-y-4">
         <div className="flex gap-4 mb-2">
            <div className={`flex-1 p-4 rounded-lg flex items-center gap-3 border ${istarData ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {istarData ? <Users className="text-emerald-600" /> : <AlertTriangle size={18} />}
              {istarData ? <span className="text-sm font-medium text-slate-700"><strong>Context loaded:</strong> DDCM (Data-Driven) AND i* Requirements</span> : 'Missing i* Model (Go to Step 2)'}
            </div>
          </div>
          <button 
            onClick={() => handleGenerate()} 
            disabled={loading || !istarData} 
            className={`w-full text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${istarData ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-400 cursor-not-allowed'}`}
          >
            <Play size={18} /> {loading ? 'Processing...' : 'Generate Requirements-Driven DW'}
          </button>
        </div>
      )}

      {error && <div className="text-red-500 bg-red-50 p-4 border border-red-200 rounded-lg mt-4 font-mono text-xs break-all">{error}</div>}

      {result && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2 h-[550px] relative z-0 overflow-hidden rounded-xl border border-slate-300">
              <SchemaViewer data={result} defaultSource="rdam" />
            </div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-y-auto h-[550px]">
               <pre className="text-purple-400 text-[10px] font-mono pt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>

          {/* PROTECTED DATE GAP TABLE (4 fixed columns, regardless of AI hallucinations) */}
          {normalizedGaps.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm mt-12">
              <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} /> Identified Data Gaps & Mitigations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-red-50 text-red-900 border-b-2 border-red-200">
                    <tr>
                      <th className="p-3 font-semibold w-24">Gap ID</th>
                      <th className="p-3 font-semibold w-[30%]">Description</th>
                      <th className="p-3 font-semibold w-[25%]">Impact</th>
                      <th className="p-3 font-semibold w-[35%]">Mitigation Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedGaps.map((gap: any, i: number) => {
                       // BRUTE-FORCE FALLBACK
                       const idStr = (gap.id && typeof gap.id === 'string' && gap.id.trim() !== '') ? gap.id : `GAP-${i + 1}`;
                       const descStr = (gap.description && typeof gap.description === 'string' && gap.description.trim() !== '') ? gap.description : '-';
                       const impactStr = (gap.impact && typeof gap.impact === 'string' && gap.impact.trim() !== '') ? gap.impact : 'Not specified';
                       const mitStr = (gap.mitigation && typeof gap.mitigation === 'string' && gap.mitigation.trim() !== '') ? gap.mitigation : 'N/A';

                       return (
                        <tr key={i} className="border-b border-red-100 hover:bg-red-50/50 transition-colors">
                          <td className="p-3 font-bold text-red-700">{idStr}</td>
                          <td className="p-3 text-slate-700">{descStr}</td>
                          <td className="p-3 text-slate-600 italic">{impactStr}</td>
                          <td className="p-3 text-emerald-700 font-medium">{mitStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result?.task_data_mapping && result.task_data_mapping.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm mt-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Database size={20} /> Table 2: Analytical Tasks to Data Sources Mapping
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-blue-50 text-blue-900 border-b-2 border-blue-200">
                    <tr>
                      <th className="p-3 font-semibold">Task ID</th>
                      <th className="p-3 font-semibold">Data Source(s)</th>
                      <th className="p-3 font-semibold">Attribute(s)</th>
                      <th className="p-3 font-semibold">Metric(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.task_data_mapping.map((mapping: any, i: number) => (
                      <tr key={i} className="border-b border-blue-50 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-indigo-700 whitespace-nowrap">{mapping.task_id}</td>
                        <td className="p-3 text-slate-700 text-xs font-mono">
                          {Array.isArray(mapping.data_sources) ? mapping.data_sources.join(', ') : mapping.data_sources}
                        </td>
                        <td className="p-3 text-slate-600">
                          {Array.isArray(mapping.attributes) ? mapping.attributes.join(', ') : mapping.attributes || '-'}
                        </td>
                        <td className="p-3 text-emerald-700 font-medium">
                          {Array.isArray(mapping.metrics) ? mapping.metrics.join(', ') : mapping.metrics || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-center flex-wrap">
            <Edit3 className="text-indigo-500" />
            <input 
              type="text" 
              value={refineText} 
              onChange={(e) => setRefineText(e.target.value)} 
              placeholder="Refine model..." 
              className="flex-1 min-w-[200px] p-2.5 border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-500" 
              disabled={loading} 
              onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)} 
            />
            <button 
              onClick={() => handleGenerate(true)} 
              disabled={loading || !refineText} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={16} /> Refine
            </button>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
             <button 
               onClick={() => { completeStep('rdam', result); onNext?.(); }} 
               className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
             >
               <Check size={20} /> Approve RDAM
             </button>
          </div>
        </div>
      )}
    </div>
  );
}