/**
 * ============================================================================
 * Component: Main Pipeline Orchestrator (PipelinePage.tsx)
 * ============================================================================
 */

import React, { useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { useAuthStore } from '../store/authStore';
import { Database, CheckCircle, Lock, FolderOpen, PlusCircle, AlertTriangle } from 'lucide-react';
import HistorySidebar from '../components/layout/HistorySidebar';
import DdcmBlock from '../components/blocks/DdcmBlock';
import RsrBlock from '../components/blocks/RsrBlock';
import DdamBlock from '../components/blocks/DdamBlock';
import RdamBlock from '../components/blocks/RdamBlock';
import MdamBlock from '../components/blocks/MdamBlock';
import AvBlock from '../components/blocks/AvBlock';
import VoBlock from '../components/blocks/VoBlock';

export function PipelinePage() {
  const { user } = useAuthStore();
  const { steps, resetPipeline } = usePipelineStore();

  const [activeTab, setActiveTab] = useState<string>('ddcm');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const handleNewProject = () => {
    if (window.confirm('Start a new project? Unsaved data will be lost.')) {
      resetPipeline();
      setActiveTab('ddcm');
    }
  };

  const getCustomStatus = (id: string) => {
    if (steps[id as keyof typeof steps] === 'completed') return 'completed';
    if (id === 'ddcm' || id === 'rsr') return 'unlocked';
    if (id === 'ddam' && steps.ddcm === 'completed') return 'unlocked';
    if (id === 'rdam' && steps.rsr === 'completed') return 'unlocked';
    if (id === 'mdam' && steps.ddam === 'completed' && steps.rdam === 'completed') return 'unlocked';
    if (id === 'av' && steps.mdam === 'completed') return 'unlocked';
    if (id === 'vo' && steps.av === 'completed') return 'unlocked';
    return 'locked';
  };

  const willCauseReset = (targetTab: string) => {
    if (targetTab === 'ddcm' && (steps.ddam === 'completed' || steps.mdam === 'completed')) return true;
    if (targetTab === 'rsr' && (steps.rdam === 'completed' || steps.mdam === 'completed')) return true;
    if (targetTab === 'ddam' && steps.mdam === 'completed') return true;
    if (targetTab === 'rdam' && steps.mdam === 'completed') return true;
    if (targetTab === 'mdam' && steps.av === 'completed') return true;
    if (targetTab === 'av' && steps.vo === 'completed') return true;
    return false;
  };

  const handleTabClick = (targetStep: string) => {
    if (getCustomStatus(targetStep) === 'locked') return;
    if (willCauseReset(targetStep)) setPendingTab(targetStep);
    else setActiveTab(targetStep);
  };

  const confirmNavigation = () => {
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  };

  const handleDdamNext = () => {
    if (steps.rdam !== 'completed') setActiveTab('rsr');
    else setActiveTab('mdam');
  };

  const handleRdamNext = () => {
    if (steps.ddam !== 'completed') setActiveTab('ddcm');
    else setActiveTab('mdam');
  };

  const NODE_R = 36; 

  const nodes = [
    { id: 'ddcm', label: 'DDCM', icon: 'DATA',      cx: 120, cy: 110  },
    { id: 'ddam', label: 'DDAM', icon: 'DW',        cx: 320, cy: 110  },
    { id: 'rsr',  label: 'RSR',  icon: 'REQ',       cx: 120, cy: 270 },
    { id: 'rdam', label: 'RDAM', icon: 'DW',        cx: 320, cy: 270 },
    { id: 'mdam', label: 'MDAM', icon: 'INTEGRATE', cx: 520, cy: 190 },
    { id: 'av',   label: 'AV',   icon: 'VIZ',       cx: 720, cy: 190 },
    { id: 'vo',   label: 'VO',   icon: 'DASH',      cx: 920, cy: 190 },
  ];

  const renderSvgNode = (node: typeof nodes[0]) => {
    const status = getCustomStatus(node.id);
    const isActive = activeTab === node.id;
    const isClickable = status !== 'locked';

    const fill =
      !isClickable ? '#f1f5f9' :
      isActive     ? '#dbeafe' :
      status === 'completed' ? '#dcfce7' : '#ffffff';

    const stroke =
      !isClickable ? '#cbd5e1' :
      isActive     ? '#2563eb' :
      status === 'completed' ? '#22c55e' : '#94a3b8';

    const textColor =
      !isClickable ? '#94a3b8' :
      isActive     ? '#1d4ed8' :
      status === 'completed' ? '#16a34a' : '#475569';

    return (
      <g
        key={node.id}
        onClick={() => isClickable && handleTabClick(node.id)}
        style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
      >
        <circle
          cx={node.cx} cy={node.cy} r={NODE_R}
          fill={fill}
          stroke={stroke}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {status === 'completed' ? (
          <path
            d={`M ${node.cx - 12} ${node.cy} l 8 8 l 16 -16`}
            fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />
        ) : status === 'locked' ? (
          <g fill={textColor}>
            <rect x={node.cx - 8} y={node.cy - 3} width={16} height={13} rx="2" />
            <path d={`M ${node.cx - 5} ${node.cy - 3} a 5 5 0 0 1 10 0`} fill="none" stroke={textColor} strokeWidth="2" />
          </g>
        ) : (
          <text x={node.cx} y={node.cy + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill={textColor} letterSpacing="-0.5">
            {node.icon}
          </text>
        )}
        <text
          x={node.cx} y={node.cy - NODE_R - 6}
          textAnchor="middle" fontSize="10" fontWeight="800"
          fill={isActive ? '#1d4ed8' : !isClickable ? '#94a3b8' : '#334155'}
          letterSpacing="0.5"
          style={{ textTransform: 'uppercase' }}
        >
          {node.label}
        </text>
      </g>
    );
  };

  
  const off = NODE_R + 4;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <div className="relative z-[9999]">
        <HistorySidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm relative z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-600" size={24} />
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">Multi-driven Analytical Tool</h1>
          </div>
          <button onClick={handleNewProject} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
            <PlusCircle size={16} /> New Project
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-2 text-sm font-bold bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors">
            <FolderOpen size={16} /> My Projects
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-sm font-medium text-slate-600 hidden sm:block">👤 {user?.name || 'Apresentação'}</span>
        </div>
      </header>

      <div className="bg-white border-b shadow-sm relative z-30 py-6">
        <div className="w-full max-w-5xl mx-auto px-4">
          <svg
            viewBox="0 0 1000 420"
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ height: 'auto', maxHeight: '320px' }}
          >
            <defs>
              <marker id="arrowSolid" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#cbd5e1" />
              </marker>
              <marker id="arrowDashed" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#94a3b8" />
              </marker>
            </defs>

            
            <line x1={120+off} y1={110} x2={320-off} y2={110} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />
            <line x1={120+off} y1={270} x2={320-off} y2={270} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />
            <line x1={320+off*0.7} y1={110+off*0.7} x2={520-off*0.7} y2={190-off*0.7} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />
            <line x1={320+off*0.7} y1={270-off*0.7} x2={520-off*0.7} y2={190+off*0.7} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />
            <line x1={520+off} y1={190} x2={720-off} y2={190} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />
            <line x1={720+off} y1={190} x2={920-off} y2={190} stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowSolid)" />

            
            <line
              x1={120+off*0.7} y1={110+off*0.7}
              x2={320-off*0.7} y2={270-off*0.7}
              stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,5"
              markerEnd="url(#arrowDashed)"
            />

            
            <path
              id="rsr-av-path"
              d={`M 120 ${270+off} C 120 370, 720 370, 720 ${190+off}`}
              stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,5"
              fill="none" markerEnd="url(#arrowDashed)"
            />
            <text fontSize="9" fontWeight="700" fill="#64748b">
              <textPath href="#rsr-av-path" startOffset="48%" textAnchor="middle" dy="-4"></textPath>
            </text>

            
            <path
              id="rsr-vo-path"
              d={`M 120 ${270+off} C 120 392, 920 392, 920 ${190+off}`}
              stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,5"
              fill="none" markerEnd="url(#arrowDashed)"
            />
            <text fontSize="9" fontWeight="700" fill="#64748b">
              <textPath href="#rsr-vo-path" startOffset="54%" textAnchor="middle" dy="13"></textPath>
            </text>

            
            {nodes.map(renderSvgNode)}
          </svg>
          
          
          <div className="flex justify-center items-center gap-8 mt-2 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-[3px] bg-[#cbd5e1] relative flex items-center">
                <div className="absolute -right-1.5 w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-[#cbd5e1]"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Steps</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 border-t-[2px] border-dashed border-[#94a3b8] relative flex items-center">
                <div className="absolute -right-1.5 w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-[#94a3b8]"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Context</span>
            </div>
          </div>

        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10">
        {activeTab === 'ddcm' && <DdcmBlock onNext={() => setActiveTab('ddam')} />}
        {activeTab === 'rsr'  && <RsrBlock  onNext={() => setActiveTab('rdam')} />}
        {activeTab === 'ddam' && <DdamBlock onNext={handleDdamNext} />}
        {activeTab === 'rdam' && <RdamBlock onNext={handleRdamNext} />}
        {activeTab === 'mdam' && <MdamBlock onNext={() => setActiveTab('av')} />}
        {activeTab === 'av'   && <AvBlock   onNext={() => setActiveTab('vo')} />}
        {activeTab === 'vo'   && <VoBlock />}
      </main>

      {pendingTab && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border-t-4 border-orange-500 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-orange-500" size={28} />
              <h3 className="text-xl font-bold text-slate-800">Warning: Reset da Pipeline</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              If you refine the <strong className="uppercase">{pendingTab}</strong> step, the dependent steps will be updated (i.e., they will undergo a reset). Do you still want to go back and lose the current progress?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingTab(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmNavigation} className="px-5 py-2.5 text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors">Yes, refine step</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}