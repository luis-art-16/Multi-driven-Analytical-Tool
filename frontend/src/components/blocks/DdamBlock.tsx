/**
 * ============================================================================
 * Component: Data-Driven Analytical Model Block (DdamBlock.tsx)
 * Description: 
 * UI component for the DDAM stage. Triggers the generation of the dimensional 
 * Star/Constellation schema from the previously extracted ERD. Injects a 
 * forced 'ddam' source flag into the resulting schema to ensure strict 
 * color-coding (Blue) in the ReactFlow visualizer.
 * ============================================================================
 */

import React, { useState } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Check, Play, Edit3, Send } from 'lucide-react';
import { apiClient } from '../../api/client';
import { SchemaViewer } from '../SchemaViewer';

export default function DdamBlock({ onNext }: { onNext?: () => void }) {
  const { completeStep, invalidateFrom, sharedData, steps } = usePipelineStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(sharedData.ddamDw);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (isRefinement = false) => {
    invalidateFrom('ddam');
    setLoading(true); 
    setError('');
    
    try {
      const payload = isRefinement 
        ? { der_model: `Current Model: ${JSON.stringify(result)}. Refine with: ${refineText}`, temperature: 0.2 }
        : { der_model: sharedData.derJson, temperature: 0.1 };
        
      const res = await apiClient.post('/ddam/generate', payload);
      
      // FORCE BLUE COLOR (DDAM) ON ALL TABLES AND COLUMNS
      const coloredData = {
        ...res.data.dw_schema,
        tables: res.data.dw_schema.tables?.map((t: any) => ({
          ...t, 
          source: 'ddam', 
          columns: t.columns?.map((c: any) => 
            typeof c === 'object' ? { ...c, source: 'ddam' } : c
          )
        })) || []
      };

      setResult(coloredData);
      
      if (isRefinement) setRefineText('');
    } catch (err: any) { 
      setError("Error generating DDAM."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">3. Data-driven Analytical Model (DDAM)</h2>
      <p className="text-slate-600 mb-6">Use the Conceptual Model (ERD) to propose a Data Warehouse model focused on the available data.</p>

      {!result && (
        <button onClick={() => handleGenerate()} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
          <Play size={18} /> {loading ? 'Processing...' : 'Generate Data-Driven DW'}
        </button>
      )}

      {error && <div className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border">{error}</div>}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2"><SchemaViewer data={result} defaultSource="ddam" /></div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-y-auto h-[550px]">
               <h4 className="text-slate-400 text-xs font-bold uppercase border-b border-slate-700 pb-2">DDAM JSON</h4>
               <pre className="text-blue-400 text-xs font-mono pt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-center">
            <Edit3 className="text-blue-500" />
            <input 
              type="text" 
              value={refineText} 
              onChange={(e) => setRefineText(e.target.value)} 
              placeholder="Refine model (e.g., Rename table Fact to Fact_Sales)..." 
              className="flex-1 p-2.5 border border-blue-200 rounded-lg text-sm" 
              disabled={loading} 
              onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)} 
            />
            <button onClick={() => handleGenerate(true)} disabled={loading || !refineText} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
              <Send size={16} /> Refine
            </button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
             <span className="text-sm font-medium text-slate-500">
               {steps.ddam === 'completed' ? 'DDAM Approved.' : 'Approve to unlock RDAM (requires RSR).'}
             </span>
             <button onClick={() => { completeStep('ddam', result); if(onNext) onNext(); }} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
               <Check size={20} /> Approve DDAM
             </button>
          </div>
        </div>
      )}
    </div>
  );
}