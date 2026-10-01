/**
 * ============================================================================
 * Component: Dashboard Viewer (DashboardViewer.tsx)
 * ============================================================================
 */

import React, { useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';

interface VisualizationItem {
  id?: string;
  visualization_id?: string;
  task_id?: string;
  title?: string;
  chart_type?: string;
  recommended_visualization?: string;
  type?: string;
  applied_hierarchy?: string;
  applied_filters?: string[];
  applied_metrics?: string[];
  metrics?: string[];
  applied_dimensions?: string[];
  dimensions?: string[];
  sample_data?: any[];
  grid_position?: { w: number; h: number; x: number; y: number };
}

interface Dashboard {
  dashboard_name?: string;
  strategic_goal?: string;
  layout?: VisualizationItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const parseTags = (tagData: any): string[] => {
  if (!tagData) return [];
  if (!Array.isArray(tagData)) return [String(tagData)];
  return tagData.map(t => typeof t === 'object' && t !== null ? (t.name || t.id || JSON.stringify(t)) : String(t)).filter(t => t && t.trim() !== '' && t !== '[]');
};

const renderChart = (item: VisualizationItem) => {
  try {
    if (!item) return null;
    let rawData = item.sample_data;
    
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return <div className="text-red-500 font-bold text-sm flex items-center justify-center h-[250px] bg-red-50 border border-red-200 border-dashed rounded-xl w-full">No Data Extracted</div>;
    }

    const validData = rawData.filter(d => d !== null && typeof d === 'object');
    if (validData.length === 0) return <div className="text-red-500 text-sm flex items-center justify-center h-[250px] w-full">Invalid Format</div>;

    const keys = Object.keys(validData[0]);
    if (keys.length === 0) return <div className="text-red-500 text-sm flex items-center justify-center h-[250px] w-full">Empty Object</div>;

    let possibleX = keys.find(k => typeof validData[0][k] === 'string' && isNaN(Number(validData[0][k])));
    let possibleY = keys.find(k => typeof validData[0][k] === 'number' || !isNaN(Number(validData[0][k])));
    
    let xAxisKey = keys.includes('name') ? 'name' : (possibleX || keys[0]);
    let dataKey = keys.includes('value') ? 'value' : (possibleY || (keys.length > 1 ? keys[1] : keys[0]));

    const chartData = validData.map((d, index) => {
      const parsedValue = Number(d[dataKey]);
      return {
        ...d,
        [xAxisKey]: String(d[xAxisKey] || `Item ${index}`),
        [dataKey]: isNaN(parsedValue) ? 0 : parsedValue 
      };
    });

    let cType = String(item.chart_type || item.recommended_visualization || item.type || 'bar').toLowerCase();
    
    if (cType.includes('kpi') || cType.includes('gauge') || cType.includes('metric')) cType = 'bar';
    if ((cType.includes('line') || cType.includes('area')) && chartData.length <= 1) cType = 'bar';

    if (cType.includes('heatmap')) {
      const maxVal = Math.max(...chartData.map(d => Number(d[dataKey]) || 0));
      return (
        <div className="w-full h-[250px] flex flex-col overflow-auto custom-scrollbar">
          <div className="flex flex-1 gap-1">
            {chartData.map((row, idx) => {
              const val = Number(row[dataKey]) || 0;
              const intensity = maxVal > 0 ? Math.max(0.15, val / maxVal) : 0.15;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end rounded-md group relative transition-all min-w-[50px] h-full" style={{ backgroundColor: `rgba(249, 115, 22, ${intensity})` }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-orange-900/80 rounded-md transition-opacity">
                    <span className="text-white font-bold text-lg">{val}</span>
                  </div>
                  <span className="text-[10px] text-orange-950 font-bold pb-2 text-center truncate w-full px-1">{row[xAxisKey]}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (cType.includes('table') || cType.includes('grid')) {
      return (
        <div className="w-full h-[250px] overflow-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-bold text-slate-600 border-b border-slate-200 capitalize">{xAxisKey}</th>
                <th className="p-3 font-bold text-slate-600 border-b border-slate-200 capitalize">{dataKey}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-800">{row[xAxisKey]}</td>
                  <td className="p-3 font-mono font-bold text-blue-600">{row[dataKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (cType.includes('scatter')) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis dataKey={dataKey} type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
            <Scatter name="Dados" data={chartData} fill="#f59e0b" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (cType.includes('radar')) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} />
            <PolarRadiusAxis />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
            <Radar name="Dados" dataKey={dataKey} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (cType.includes('composed')) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
            <Bar dataKey={dataKey} barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey={dataKey} stroke="#f59e0b" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (cType.includes('line')) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
            <Line type="monotone" dataKey={dataKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (cType.includes('pie') || cType.includes('doughnut')) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey={dataKey} nameKey={xAxisKey}>
              {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
          <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  } catch (error) {
    return <div className="text-red-500 text-sm flex items-center justify-center h-[250px]">Render Error</div>;
  }
};

export function DashboardViewer({ data, originalAvData }: { data: any, originalAvData?: any[] }) {
  if (!data) return <div className="text-slate-500 p-8 text-center bg-white rounded-xl border border-dashed border-slate-300">Loading Data...</div>;

  let dashboards: Dashboard[] = [];
  if (Array.isArray(data)) dashboards = [{ dashboard_name: "Analytical Visualisations", layout: data }];
  else if (data.dashboards && Array.isArray(data.dashboards)) dashboards = data.dashboards;
  
  dashboards = dashboards.filter(d => d !== null && typeof d === 'object');
  if (dashboards.length === 0) return <div className="text-slate-500 p-4">No dashboards generated.</div>;

  // Ensures the original array is cleared of nulls
  const safeOriginalAvData = Array.isArray(originalAvData) ? originalAvData.filter(v => v !== null && typeof v === 'object') : [];

  return (
    <div className="w-full space-y-12 bg-slate-100 p-6 rounded-xl border border-slate-200">
      {dashboards.map((dashboard, dIndex) => {
        if (!dashboard) return null;
        
        let itemsToRender = Array.isArray(dashboard.layout) && dashboard.layout.length > 0
            ? dashboard.layout
            : safeOriginalAvData.filter((av: any) => av && (
                av.sg_supported === dashboard.strategic_goal || 
                av.sg_supported === dashboard.dashboard_name ||
                (dashboard.dashboard_name && String(dashboard.dashboard_name).includes(String(av.sg_supported)))
              ));

        itemsToRender = itemsToRender.filter((item: any) => item !== null && typeof item === 'object');
        if (itemsToRender.length === 0) return null;

        return (
          <div key={`dash-${dIndex}`} className="space-y-6">
            <div className="pb-4 border-b-2 border-slate-300">
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{dashboard.strategic_goal || dashboard.dashboard_name || "Dashboard"}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
              {(() => {
                const processedLayout = itemsToRender.map((item: any) => {
                    let w = (item.grid_position && typeof item.grid_position.w === 'number') ? item.grid_position.w : 6;
                    if (w > 12) w = 12;
                    return { ...item, computedW: w };
                });

                let currentCol = 0;
                for (let i = 0; i < processedLayout.length; i++) {
                    let w = processedLayout[i].computedW;
                    if (currentCol + w > 12) {
                        if (i > 0 && currentCol < 12) {
                            processedLayout[i - 1].computedW += (12 - currentCol);
                        }
                        currentCol = 0;
                    }
                    currentCol += processedLayout[i].computedW;
                    if (currentCol >= 12) currentCol = 0;
                }
                
                if (currentCol > 0 && currentCol < 12) {
                    processedLayout[processedLayout.length - 1].computedW += (12 - currentCol);
                }

                return processedLayout.map((item: any, iIndex: number) => {
                  const colSpan = item.computedW;

                  if (!item.sample_data || item.sample_data.length === 0) {
                    const orig = safeOriginalAvData.find((v: any) => (String(v.id) === String(item.visualization_id) || String(v.task_id) === String(item.visualization_id) || String(v.id) === String(item.id)));
                    if (orig) {
                        item.sample_data = orig.sample_data;
                        if (!item.chart_type) item.chart_type = orig.chart_type || orig.recommended_visualization;
                    }
                  }

                  const metricas = parseTags(item.applied_metrics || item.metrics);
                  const dimensoes = parseTags(item.applied_dimensions || item.dimensions);

                  return (
                    <div key={`chart-${dIndex}-${iIndex}-${item.visualization_id || item.id || Date.now()}`} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col" style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}>
                      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex flex-col gap-1">
                        <h3 className="font-bold text-slate-800 text-sm">{item.title || "Untitled Chart"}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {metricas.length > 0 && <span className="text-[9px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold border border-red-200">Metric: {metricas.join(', ')}</span>}
                          {dimensoes.length > 0 && <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold border border-indigo-200">Dimension: {dimensoes.join(', ')}</span>}
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-center flex-1">
                        {renderChart(item)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}