"""
===============================================================================
Module: Visualizations Organization (vo.py)
Description: 
    Orchestrates the UI/UX layout generation for the final Dashboard. Maps 
    the analytical visualizations (AV) generated previously to specific 
    Strategic Goals from the i* framework. Determines structural properties 
    such as grid rows and component widths to ensure a logical storytelling flow.
    Includes Smart Merge, Mathematical Grid Positioning, and Auto-ID Injection 
    to completely prevent Token Timeouts and JSON Syntax Errors from the LLM.
===============================================================================
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import json
import re
import logging
from services.mistral_client import call_mistral_api

logger = logging.getLogger("pipeline_api")
logger.setLevel(logging.INFO) 
router = APIRouter(prefix="/vo", tags=["VO"])

class VoRequest(BaseModel):
    av_model: Any = None 
    istar_model: Any = None
    temperature: float = 0.2
    group_by_dg: bool = False
    current_model: Any = None
    refine_text: str = None

def extract_json(response: str) -> dict:
    try:
        # Clean extraction, without using multi-line strings prone to SyntaxError
        match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if not match:
            logger.error(f"EXTRACTION FAILED. Response has no JSON: {response[:200]}")
            raise ValueError("JSON not found in response.")
        return json.loads(match.group(0))
    except Exception as e:
        logger.error(f"JSON PARSE ERROR: {str(e)}")
        raise ValueError(f"Extraction error: {str(e)}")

def build_vo_prompt(av_json_light: str, istar_json: str, current_model_json: str = None, refine_text: str = None) -> str:
    if current_model_json and refine_text:
        return f"""You are a UX/UI Dashboard Architect.
        
        Here is the current Visualization Organization (VO) JSON: 
        {current_model_json}
        
        The user has requested the following refinement: "{refine_text}"

        CRITICAL RULES:
        1. You must apply the user's refinement to the dashboard layout.
        2. PRESERVE EXISTING CHART TYPES: You MUST keep the exact same "chart_type" (e.g., pie, line, heatmap) for every existing visualization unless the user explicitly asked to change it. Do not default to "bar".
        3. Return ONLY valid JSON with the root key "dashboards".
        """
        
    return f"""You are a UX/UI Dashboard Architect.
    
    Analytical Visualizations (IDs and Titles only):
    {av_json_light}
    
    Business Requirements (i*):
    {istar_json}
    
    CRITICAL RULES:
    1. Group ALL visualizations into Dashboards based on Strategic Goals (SG).
    2. You MUST use the EXACT 'visualization_id' from the input.
    3. DO NOT generate 'sample_data', 'applied_metrics', 'grid_position', or 'chart_type' (Python will handle this, saving tokens).
    4. ALLOWED CHART TYPES: 'bar', 'line', 'pie', 'scatter', 'heatmap', 'table', 'radar', 'composed'. NEVER use 'kpi', 'metric', 'gauge', 'area', or 'doughnut'.
    5. Use double quotes for all JSON keys.
    6. Return ONLY the JSON object. Do not add any conversational text before or after the JSON.
    
    OUTPUT FORMAT:
    {{
       "dashboards": [
         {{
           "dashboard_id": "dash_1",
           "dashboard_name": "SG1 Dashboard",
           "layout": [
             {{
                "visualization_id": "T1",
                "title": "Total Energy"
             }}
           ]
         }}
       ]
    }}"""


@router.post("/generate")
async def generate_vo(req: VoRequest):
    logger.info("\n" + "="*50)
    logger.info("START OF VO REQUEST (VISUALIZATION ORGANIZATION)")
    logger.info("="*50)
    
    original_av_list = []
    if isinstance(req.av_model, list):
        original_av_list = req.av_model
    elif isinstance(req.av_model, dict):
        original_av_list = req.av_model.get("visualisations", req.av_model.get("visualizations", []))

    logger.info(f"-> Received {len(original_av_list)} visualizations from AV for organization.")

    lightweight_av = []
    for v in original_av_list:
        lightweight_av.append({
            "visualization_id": v.get("id", v.get("task_id", "")),
            "title": v.get("title", ""),
            "sg_supported": v.get("sg_supported", "")
        })

    safe_av = json.dumps(lightweight_av)
    safe_istar = json.dumps(req.istar_model) if req.istar_model else "{}"
    
    if req.current_model and req.refine_text:
        prompt = build_vo_prompt(safe_av, safe_istar, json.dumps(req.current_model), req.refine_text)
    else:
        prompt = build_vo_prompt(safe_av, safe_istar)
    
    try:
        logger.info(f"-> Calling Mistral API... (Lightweight prompt size: {len(prompt)} characters)")
        raw_response = await call_mistral_api(prompt, req.temperature)
        
        logger.info(raw_response)
        
        data = extract_json(raw_response)
        logger.info("-> JSON Extracted Successfully.")
        
        if isinstance(data, list):
            data = {"dashboards": [{"dashboard_id": "dash_1", "dashboard_name": "Main Dashboard", "layout": data}]}
        elif "dashboards" not in data:
            data = {"dashboards": [{"dashboard_id": "dash_1", "dashboard_name": "Main Dashboard", "layout": data.get("layout", [data])}]}
            
        available_avs = list(original_av_list) 
        
        for d in data.get("dashboards", []):
            if "layout" not in d:
                d["layout"] = []
            
            enriched_layout = []
            
            # GRID MATH
            current_x = 0
            current_y = 0
            
            for item in d.get("layout", []):
                viz_id = str(item.get("visualization_id", item.get("id", "")))
                viz_title = item.get("title", "")
                
                original_viz = next((v for v in available_avs if str(v.get("id", "")) == viz_id or str(v.get("task_id", "")) == viz_id), None)
                
                if original_viz:
                    available_avs.remove(original_viz)
                else:
                    original_viz = next((v for v in available_avs if v.get("title", "") == viz_title), None)
                    if original_viz:
                        available_avs.remove(original_viz)
                    elif len(available_avs) > 0:
                        original_viz = available_avs.pop(0)
                    else:
                        original_viz = {} 

                # CRITICAL FIX: Prioritize the LLM-generated type in the item (to support refine) instead of defaulting to original_viz
                best_chart_type = item.get("chart_type") or original_viz.get("chart_type") or original_viz.get("recommended_visualization") or "bar"
                best_chart_type = str(best_chart_type).lower()
                
                if "kpi" in best_chart_type or "metric" in best_chart_type or "gauge" in best_chart_type:
                    best_chart_type = "bar"

                # SIZING LOGIC (W and H)
                if best_chart_type in ['table', 'grid', 'scatter', 'heatmap', 'line', 'area', 'composed']:
                    w = 12
                    h = 5
                else:
                    w = 6
                    h = 4
                
                # POSITIONING LOGIC (X and Y)
                if current_x + w > 12:
                    current_x = 0
                    current_y += h
                
                safe_gp = {
                    "w": w,
                    "h": h,
                    "x": current_x,
                    "y": current_y
                }
                
                # Update X pointer for the next chart
                current_x += w

                merged_item = {
                    **original_viz,
                    "visualization_id": original_viz.get("id", original_viz.get("task_id", viz_id)),
                    # FIX: Also respects title changes made by the LLM during refine
                    "title": item.get("title", original_viz.get("title", viz_title)),
                    "chart_type": best_chart_type,
                    "grid_position": safe_gp,
                    "dashboard_name": d.get("dashboard_name", "Main Dashboard")
                }
                
                enriched_layout.append(merged_item)
            
            d["layout"] = enriched_layout
        
        logger.info("-> Fusion completed and sent to the Frontend. No Errors.")
        return {"status": "success", "vo_model": data}
        
    except Exception as e:
        logger.error(f"VO Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))