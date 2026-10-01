import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Check, Play, Edit3, Send, Upload, Cpu, FileJson } from 'lucide-react';
import { apiClient } from '../../api/client';
import { DiagramViewer } from '../DiagramViewer';

export default function RsrBlock({ onNext }: { onNext: () => void }) {
  const { completeStep, invalidateFrom, sharedData, steps } = usePipelineStore();
  const [inputText, setInputText] = useState('');
  const [refineText, setRefineText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(sharedData.istarModel);
  useEffect(() => {
    setResult(sharedData?.istarModel || null);
  }, [sharedData?.istarModel]);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState<'ai' | 'upload'>('ai');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try { setResult(JSON.parse(event.target?.result as string)); } 
      catch (err) { setError("Invalid JSON file."); }
    };
    reader.readAsText(file);
  };

  const handleGenerate = async (isRefinement = false) => {
    invalidateFrom('rsr');
    const prompt = isRefinement ? `Current Model: ${JSON.stringify(result)}. Refine based on this instruction: ${refineText}. ONLY RETURN ENGLISH JSON.` : `${inputText}. ONLY RETURN ENGLISH JSON.`;
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/rsr/generate', { input_text: prompt, temperature: 0.2 });
      setResult(res.data.istar_model);
      if (isRefinement) setRefineText('');
    } catch (err: any) { setError("Error generating i* model."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">2. Requirements Structuring and Refinement (RSR)</h2>
      <p className="text-slate-600 mb-6">Describe the analytical goals or upload an existing i* JSON model.</p>

      {!result && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-4">
            <button onClick={() => setInputMode('ai')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${inputMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Cpu size={16}/> AI Generate</button>
            <button onClick={() => setInputMode('upload')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${inputMode === 'upload' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FileJson size={16}/> Upload JSON</button>
          </div>

          {inputMode === 'ai' ? (
            <div className="space-y-4 animate-in fade-in">
              <textarea className="w-full h-32 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm" placeholder="e.g., The Manager needs to analyze monthly sales..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={loading} />
              <button onClick={() => handleGenerate()} disabled={loading || !inputText} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"><Play size={18} /> {loading ? 'Processing...' : 'Generate i* Model'}</button>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center text-center animate-in fade-in">
              <Upload className="text-slate-400 mb-3" size={32} />
              <h3 className="font-bold text-slate-700 mb-1">Upload i* Model</h3>
              <label className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-6 py-2 rounded-lg cursor-pointer font-bold shadow-sm mt-2">
                 Choose File... <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>
      )}

      {error && <div className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border">{error}</div>}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2"><DiagramViewer data={result} /></div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-y-auto h-[600px]">
               <h4 className="text-slate-400 text-xs font-bold uppercase border-b border-slate-700 pb-2">Generated JSON</h4>
               <pre className="text-green-400 text-xs font-mono pt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
          
          {/* RSR Traceability Table moved out of the grid to occupy 100% of the width */}
          {result?.dependencies && result.dependencies.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">i* Requirements Traceability Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3 rounded-tl-lg font-semibold w-48">Requirement Type</th>
                      <th className="p-3 font-semibold">Description (Dependum)</th>
                      <th className="p-3 rounded-tr-lg font-semibold">Depender → Dependee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dependencies.map((dep: any, i: number) => {
                      let badgeColor = "bg-slate-100 text-slate-700";
                      if (dep.type?.includes("Strategic")) badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
                      else if (dep.type?.includes("Decision")) badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                      else if (dep.type?.includes("Information")) badgeColor = "bg-orange-100 text-orange-800 border-orange-200";
                      else if (dep.type?.includes("Task")) badgeColor = "bg-purple-100 text-purple-800 border-purple-200";

                      return (
                        <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${badgeColor}`}>
                              {dep.type || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{dep.dependum}</td>
                          <td className="p-3 text-xs text-slate-500">{dep.depender} → {dep.dependee}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-center">
            <Edit3 className="text-indigo-500" />
            <input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Refine model (e.g., Add Supplier actor)..." className="flex-1 p-2.5 border rounded-lg text-sm outline-none" disabled={loading} onKeyDown={(e) => e.key === 'Enter' && refineText && handleGenerate(true)} />
            <button onClick={() => handleGenerate(true)} disabled={loading || !refineText} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Send size={16} /> Refine</button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
             <span className="text-sm font-medium text-slate-500">{steps.rsr === 'completed' ? '✅ Model Approved.' : 'Review and approve to proceed.'}</span>
             <button onClick={() => { completeStep('rsr', result); onNext(); }} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Check size={20} /> Approve i* Model</button>
          </div>
        </div>
      )}
    </div>
  );
}