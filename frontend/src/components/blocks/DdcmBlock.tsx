/**
 * ============================================================================
 * Component: Data-Driven Conceptual Model Block (DdcmBlock.tsx)
 * Description: 
 * Handles the initial data ingestion step. Allows users to upload raw CSV 
 * files (triggering the backend to infer an ERD via LLM) or directly bypass 
 * the step by uploading a pre-computed JSON schema.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { Upload, FileJson, Check, Play } from 'lucide-react';
import { apiClient } from '../../api/client';

export default function DdcmBlock({ onNext }: { onNext: () => void }) {
  const { completeStep, sharedData } = usePipelineStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // The key is here: the "?." prevents React from crashing if the old history lacks "sharedData"
  const [localDer, setLocalDer] = useState<any>(sharedData?.derJson || null);
  useEffect(() => {
    setLocalDer(sharedData?.derJson || null);
  }, [sharedData?.derJson]);

  // Upload direct of a pre-computed DER.json
  const handleDirectJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setLocalDer(json);
        setError(null);
      } catch (err) {
        setError("The uploaded file is not a valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Upload CSVs for backend processing
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await apiClient.post('/ddcm/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLocalDer(res.data.der_model);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error generating model via AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!localDer) return;
    completeStep('ddcm', localDer);
    onNext(); // Visually jump to the next tab
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">1. Data-Driven Conceptual Model (DDCM)</h2>
      <p className="text-slate-600 mb-8">Generate the Entity-Relationship Diagram from CSV files or upload a previously generated model.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* OPTION A: Generate with AI */}
        <div className="border-2 border-dashed border-blue-300 bg-blue-50 p-6 rounded-xl text-center">
          <Play className="mx-auto text-blue-500 mb-3" size={32} />
          <h3 className="font-bold text-slate-800 mb-2">Generate with AI</h3>
          <p className="text-xs text-slate-500 mb-4">Upload multiple .csv files to infer the schema.</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition flex justify-center items-center gap-2">
            <Upload size={16} /> Select CSV
            <input type="file" multiple accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={loading} />
          </label>
        </div>

        {/* OPTION B: Direct JSON upload */}
        <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-6 rounded-xl text-center">
          <FileJson className="mx-auto text-slate-500 mb-3" size={32} />
          <h3 className="font-bold text-slate-800 mb-2">Import ERD.json</h3>
          <p className="text-xs text-slate-500 mb-4">If you already have a generated model, skip the generation.</p>
          <label className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition flex justify-center items-center gap-2">
            <Upload size={16} /> Select JSON
            <input type="file" accept=".json" className="hidden" onChange={handleDirectJsonUpload} disabled={loading} />
          </label>
        </div>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Analyzing data and communicating with Mistral AI...</p>
        </div>
      )}

      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {/* RESULT PREVIEW */}
      {localDer && !loading && (
        <div className="mt-8 border-t pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Preview of the Model</h3>
            <button 
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition"
            >
              <Check size={18} /> Accept and Continue
            </button>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-green-400 text-xs font-mono">{JSON.stringify(localDer, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}