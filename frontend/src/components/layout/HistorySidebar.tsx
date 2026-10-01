import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Clock, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) fetchProjects();
  }, [isOpen, user?.email]);

  const fetchProjects = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const emailToUse = user?.email || 'admin@Multi_drivenAnalyticalTool.pt';
      const res = await apiClient.get(`/history/list/${encodeURIComponent(emailToUse)}`);
      setProjects(res.data.projects || []);
    } catch (error) {
      console.error("Error loading history", error);
      setErrorMsg("Failed to load project history.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (projectName: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const emailToUse = user?.email || 'admin@Multi_drivenAnalyticalTool.pt';
      const safeProjectName = encodeURIComponent(projectName).replace(/%2F/g, '%252F');
      const safeEmail = encodeURIComponent(emailToUse);
      
      const res = await apiClient.get(`/history/load/${safeProjectName}/${safeEmail}`);
      
      if (!res.data || !res.data.project) {
         throw new Error("Project format is invalid or corrupted.");
      }

      let rawData = res.data.project.pipeline_data || res.data.project.data || res.data.project;
      
      
      if (typeof rawData === 'string') {
          try { rawData = JSON.parse(rawData); } catch(e) { console.warn("Failed to parse stringified project data."); }
      }

      let finalSharedData = rawData.sharedData || rawData;
      
      
      let finalSteps = rawData.steps || {
          ddcm: finalSharedData.derJson ? 'completed' : 'pending', 
          rsr: (finalSharedData.istarModel || finalSharedData.istar) ? 'completed' : 'pending', 
          rdam: finalSharedData.rdamDw ? 'completed' : 'pending', 
          mdam: (finalSharedData.finalDw || finalSharedData.mdamDw) ? 'completed' : 'pending', 
          av: (finalSharedData.visualisations || finalSharedData.avData) ? 'completed' : 'pending', 
          vo: finalSharedData.voData ? 'completed' : 'pending' 
      };

      
      usePipelineStore.setState({
          steps: finalSteps,
          sharedData: finalSharedData
      });

      onClose();
      
      
      alert(`Project "${projectName}" loaded successfully!\n\nNOTE: Navigate through the tabs (e.g., RSR, RDAM or VO) to view your data. Some initial tabs may be empty if the project started midway.`);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Error loading project: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the project "${projectName}"?`)) return;
    setLoading(true);
    try {
      const emailToUse = user?.email || 'admin@Multi_drivenAnalyticalTool.pt';
      const safeProjectName = encodeURIComponent(projectName).replace(/%2F/g, '%252F');
      const safeEmail = encodeURIComponent(emailToUse);

      await apiClient.delete(`/history/delete/${safeProjectName}/${safeEmail}`);
      setProjects(projects.filter(p => p.project_name !== projectName));
    } catch (error) {
      alert("Error deleting the project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-96 bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3"><FolderOpen className="text-blue-600" /><h2 className="text-xl font-bold text-slate-800">Project History</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>
        
        {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                <span className="text-sm font-bold text-red-700">{errorMsg}</span>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
          ) : projects.length === 0 ? (
            <div className="text-center text-slate-500 py-10"><FolderOpen size={48} className="mx-auto mb-4 opacity-20" /><p className="font-medium">No saved projects found.</p></div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 truncate max-w-[200px]" title={proj.project_name}>{proj.project_name}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1 font-semibold"><Clock size={10} />{new Date(proj.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleLoadProject(proj.project_name)} className="flex-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-500 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      Load Pipeline <ArrowRight size={14} />
                    </button>
                    <button onClick={() => handleDeleteProject(proj.project_name)} className="px-3 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 rounded-lg flex items-center justify-center transition-colors" title="Delete Project">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}