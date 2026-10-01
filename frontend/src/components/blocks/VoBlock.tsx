/**
 * ============================================================================
 * Component: Visualisations Organisation Block (VoBlock.tsx)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useAuthStore } from '../../store/authStore';
import { Check, Play, Save, Edit3, Send, LayoutDashboard } from 'lucide-react';
import { apiClient } from '../../api/client';
import { DashboardViewer } from './DashboardViewer';


const getSafeAvData = (sharedData: any): any[] => {
  let data = sharedData.visualisations || sharedData.avModel?.visualisations || sharedData.avModel?.visualizations || sharedData.avData?.visualisations || sharedData.avData?.visualizations || sharedData.avData || [];
  if (!Array.isArray(data)) {
     data = data.visualisations || data.visualizations || Object.values(data) || [];
  }
  return Array.isArray(data) ? data.filter(item => item !== null && typeof item === 'object') : [];
};

export default function VoBlock() {
  const { completeStep, invalidateFrom, sharedData, steps } = usePipelineStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(sharedData.voData || null);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  // NEW STATE: Controls which tab/SG is currently selected
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    if (sharedData.voData) {
      setResult(sharedData.voData);
      // Sets the first tab as active when loading history
      if (sharedData.voData.dashboards && sharedData.voData.dashboards.length > 0 && !activeTab) {
         setActiveTab(sharedData.voData.dashboards[0].dashboard_id);
      }
    }
  }, [sharedData.voData]);

  const handleGenerate = async (isRefinement = false) => {
    setLoading(true); 
    setError('');
    try {
      const avData = getSafeAvData(sharedData);
      const istarData = sharedData.istarModel || {};
      const payload = isRefinement 
        ? { av_model: avData, istar_model: istarData, temperature: 0.3, current_model: result, refine_text: refineText }
        : { av_model: avData, istar_model: istarData, temperature: 0.1 };
      const res = await apiClient.post('/vo/generate', payload);
      const finalData = res.data?.vo_model || res.data;
      if (!finalData || !finalData.dashboards) throw new Error("Invalid format received from the AI.");

      setResult(finalData);
      // Sets the first tab as active when generating a new model
      if (finalData.dashboards && finalData.dashboards.length > 0) {
         setActiveTab(finalData.dashboards[0].dashboard_id);
      }
      if (isRefinement) setRefineText('');
    } catch (err: any) { 
      setError(err.response?.data?.detail || err.message || "Error with network (Timeout) or API Unavailable.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) return setError("Please insert a project name in the text box.");
    setLoading(true);
    try {
      await apiClient.post('/history/save', { 
        email: user?.email || 'admin@Multi_drivenAnalyticalTool.pt', 
        project_name: projectName, 
        pipeline_data: { steps, sharedData: { ...sharedData, voData: result } } 
      });
      setIsSaved(true);
      window.dispatchEvent(new Event('projectSaved'));
      alert("Pipeline finalized successfully! A confirmation email has been sent to your inbox.");
    } catch (err) { 
      setError("Error saving the project to the history."); 
    } finally { 
      setLoading(false); 
    }
  };

  
  let safeDashboards: any[] = [];
  if (result && Array.isArray(result.dashboards)) {
    safeDashboards = result.dashboards.filter((d: any) => d !== null && typeof d === 'object');
  } else if (Array.isArray(result)) {
    safeDashboards = result.filter((d: any) => d !== null && typeof d === 'object');
  }

 
  const activeDashboardData = safeDashboards.find(d => d.dashboard_id === activeTab) || safeDashboards[0];
  const filteredResult = activeDashboardData ? { ...result, dashboards: [activeDashboardData] } : result;

  let visualizationsArray: any[] = [];
  if (activeDashboardData) {
    const layout = Array.isArray(activeDashboardData.layout) ? activeDashboardData.layout.filter((l: any) => l !== null && typeof l === 'object') : [];
    layout.forEach((l: any) => {
      visualizationsArray.push({
        ...l,
        dashboard_name: activeDashboardData.dashboard_name || activeDashboardData.sg_supported || 'Main Dashboard'
      });
    });
  }

  const originalAvData = getSafeAvData(sharedData);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">7. Visualisations Organisation (VO)</h2>
      <p className="text-slate-600 mb-6">Organizes the generated charts into a cohesive analytical dashboard.</p>
      {!result && (
        <button onClick={() => handleGenerate()} disabled={loading} className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all hover:bg-blue-700">
          <Play size={20} className={loading ? "animate-pulse" : ""} /> 
          {loading ? 'Building Dashboard...' : 'Build Dashboard Layout'}
        </button>
      )}

      {error && <div className="text-red-600 mb-4 bg-red-50 p-4 border border-red-200 rounded-lg text-sm font-bold">{error}</div>}

      {result && (
        <div className="mt-6 space-y-8">
          
          {safeDashboards.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-slate-200 custom-scrollbar">
              {safeDashboards.map((d: any) => (
                <button
                  key={d.dashboard_id}
                  onClick={() => setActiveTab(d.dashboard_id)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeTab === d.dashboard_id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  {d.dashboard_name || d.dashboard_id}
                </button>
              ))}
            </div>
          )}

          <DashboardViewer data={filteredResult} originalAvData={originalAvData} />

          {visualizationsArray.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Table 4: Visualization Mapping (Active Dashboard)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3 rounded-tl-lg font-semibold w-48">Strategic Goal</th>
                      <th className="p-3 font-semibold">Task</th>
                      <th className="p-3 rounded-tr-lg font-semibold">Visualization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visualizationsArray.map((vis: any, i: number) => (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-600 font-medium">
                          {vis.sg_supported || vis.dashboard_name || vis.strategic_goal || '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs border border-indigo-200 mr-2">
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
          )}

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
            <Edit3 className="text-blue-500" />
            <input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Refine layout..." className="flex-1 p-2.5 border rounded-lg text-sm outline-none" disabled={loading} onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)} />
            <button onClick={() => handleGenerate(true)} disabled={loading || !refineText} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"><Send size={16} /> Refine</button>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <input 
                 type="text" 
                 placeholder="Enter Project Name to Save..." 
                 value={projectName} 
                 onChange={e => setProjectName(e.target.value)} 
                 onKeyDown={e => { if (e.key === 'Enter' && !isSaved && !loading && projectName.trim()) handleSaveProject(); }}
                 className="p-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-green-500 w-full sm:w-64 shadow-sm" 
                 disabled={isSaved || loading}
               />
             </div>
             
             <button 
               onClick={handleSaveProject} 
               disabled={loading || isSaved || !projectName.trim()} 
               className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isSaved ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl'}`}
             >
               {isSaved ? <><Check size={20} /> Pipeline Saved</> : <><Save size={20} /> Finalize Pipeline & Save</>}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}