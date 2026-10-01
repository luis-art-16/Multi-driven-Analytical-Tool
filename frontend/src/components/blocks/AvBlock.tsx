/**
 * ============================================================================
 * Component: Analytical Visualisations Block (AvBlock.tsx)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Check, Play, BarChart2, LineChart, PieChart, Activity, Table, Edit3, Send } from 'lucide-react';
import { apiClient } from '../../api/client';

const getSafeAvData = (sharedData: any): any[] => {
  let data = sharedData.visualisations || sharedData.avModel?.visualisations || sharedData.avModel?.visualizations || sharedData.avData?.visualisations || sharedData.avData?.visualizations || sharedData.avData || [];
  if (!Array.isArray(data)) {
     data = data.visualisations || data.visualizations || Object.values(data) || [];
  }
  return Array.isArray(data) ? data.filter(item => item !== null && typeof item === 'object') : [];
};

export default function AvBlock({ onNext }: { onNext: () => void }) {
  const { completeStep, invalidateFrom, sharedData, steps } = usePipelineStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[]>(getSafeAvData(sharedData));
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(getSafeAvData(sharedData));
  }, [sharedData]);

  const getIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('line') || t.includes('area')) return <LineChart size={16} className="text-teal-400" />;
    if (t.includes('pie') || t.includes('doughnut')) return <PieChart size={16} className="text-teal-400" />;
    if (t.includes('kpi') || t.includes('metric')) return <Activity size={16} className="text-teal-400" />;
    if (t.includes('table') || t.includes('grid')) return <Table size={16} className="text-teal-400" />;
    return <BarChart2 size={16} className="text-teal-400" />;
  };

  const handleGenerate = async (isRefinement = false) => {
    invalidateFrom('av');
    setLoading(true); 
    setError('');
    
    try {
      const mdamData = sharedData.mdamDw || sharedData.mdamModel || sharedData.mdamResult;
      const istarData = sharedData.istarModel || {};

      if (!mdamData) {
        throw new Error("Missing MDAM Data. Please complete the MDAM step first.");
      }

      const payload = isRefinement 
        ? { mdam_model: mdamData, istar_model: istarData, temperature: 0.3, current_model: result, refine_text: refineText }
        : { mdam_model: mdamData, istar_model: istarData, temperature: 0.1 };

      const res = await apiClient.post('/av/generate', payload);

      let extracted: any[] = [];
      if (res.data?.av_model?.visualisations) extracted = res.data.av_model.visualisations;
      else if (res.data?.av_model?.visualizations) extracted = res.data.av_model.visualizations;
      else if (res.data?.visualisations) extracted = res.data.visualisations;
      else if (res.data?.visualizations) extracted = res.data.visualizations;
      else if (Array.isArray(res.data?.av_model)) extracted = res.data.av_model;
      else if (Array.isArray(res.data)) extracted = res.data;

      if (!Array.isArray(extracted) || extracted.length === 0) {
        throw new Error("The AI failed to structure the visualizations correctly.");
      }

      setResult(extracted.filter(item => item !== null && typeof item === 'object'));
      if (isRefinement) setRefineText('');
      
    } catch (err: any) { 
      const errorMsg = err.response?.data?.detail || err.message || "Error generating visualizations.";
      setError(errorMsg); 
    } finally { 
      setLoading(false); 
    }
  };

 // Ensures the map never crashes, even if the result is corrupted
  const safeResult = Array.isArray(result) ? result : [];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">6. Analytical Visualisations (AV)</h2>
      <p className="text-slate-600 mb-6">Suggests the best chart types and data mappings for each analytical requirement.</p>

      {safeResult.length === 0 && (
        <button onClick={() => handleGenerate()} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
          <Play size={18} /> {loading ? 'Analyzing data and suggesting charts...' : 'Suggest Analytical Visualisations'}
        </button>
      )}

      {error && <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200 font-mono text-sm break-all">{error}</div>}

      {safeResult.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {safeResult.map((viz: any, index: number) => (
              <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="bg-slate-800 p-3 flex items-center gap-2 text-white">
                  {getIcon(viz.chart_type || viz.recommended_visualization)}
                  <h3 className="font-bold text-sm truncate" title={viz.title || viz.task_id || viz.id}>{viz.title || viz.task_id || viz.id || 'No Title'}</h3>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Goal / Requirement</span>
                    <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-2" title={viz.description || viz.sg_supported}>{viz.description || viz.sg_supported || '-'}</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 rounded-md p-2">
                    <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Chart Type</span>
                    <p className="text-sm font-bold text-teal-900 capitalize">{String(viz.recommended_visualization || viz.chart_type || 'Unknown').replace(/kpi/gi, 'bar')}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(viz.applied_metrics) && viz.applied_metrics.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded font-mono border border-blue-200">
                        Met: {viz.applied_metrics.join(', ')}
                      </span>
                    )}
                    {Array.isArray(viz.applied_dimensions) && viz.applied_dimensions.length > 0 && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-1 rounded font-mono border border-purple-200">
                        Dim: {viz.applied_dimensions.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Table 4: Visualizations Proposed by the LLM</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-3 font-semibold rounded-tl-lg">Strategic Goal</th>
                    <th className="p-3 font-semibold">Task</th>
                    <th className="p-3 font-semibold rounded-tr-lg">Visualization</th>
                  </tr>
                </thead>
                <tbody>
                  {safeResult.map((vis: any, i: number) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-600 font-medium">
                        {vis.sg_supported || vis.strategic_goal || vis.dashboard_name || '-'}
                      </td>
                      <td className="p-3 text-slate-800 font-bold">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold border border-indigo-200 mr-2">
                          {vis.visualization_id || vis.task_id || vis.id || 'Task'}
                        </span>
                        {vis.description || vis.title || '-'}
                      </td>
                      <td className="p-3 text-emerald-600 font-bold capitalize">
                        {String(vis.chart_type || vis.recommended_visualization || '-').replace(/kpi/gi, 'bar')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex gap-3 items-center">
            <Edit3 className="text-teal-600" />
            <input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Refining suggested charts..." className="flex-1 p-2.5 border border-teal-200 rounded-lg text-sm outline-none focus:border-teal-500" disabled={loading} onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)} />
            <button onClick={() => handleGenerate(true)} disabled={loading || !refineText} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"><Send size={16} /> Refine</button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
             <span className="text-sm font-medium text-slate-500">{steps.av === 'completed' ? '✅ Visualizations approved.' : 'Approve to unlock the Dashboard (VO).'}</span>
             <button onClick={() => { completeStep('av', { visualisations: safeResult }); onNext(); }} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"><Check size={20} /> Approve AV</button>
          </div>
        </div>
      )}
    </div>
  );
}