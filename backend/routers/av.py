"""
===============================================================================
Module: Analytical Visualizations (av.py)
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
router = APIRouter(prefix="/av", tags=["AV"])

class AvRequest(BaseModel):
    mdam_model: Any
    istar_model: Any
    temperature: float = 0.2
    current_model: Any = None
    refine_text: str = None

def extract_json(response: str) -> dict:
    try:
        match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(response)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON: {str(e)}")

def build_av_prompt(mdam_json: str, istar_json: str, current_model_json: str = None, refine_text: str = None) -> str:
    
    json_template = """
    OUTPUT FORMAT:
    Return ONLY a valid JSON. You must use the British spelling "visualisations" for the root key.
    {{
      "visualisations": [
        {{
          "id": "viz_1",
          "task_id": "T1",
          "title": "Vibration Evolution",
          "description": "Monitor vibrations over time",
          "sg_supported": "Strategic Goal 1",
          "chart_type": "line",
          "recommended_visualization": "Multi-series Line Chart",
          "source_table": "fact_sensor_measurement",
          "applied_metrics": ["vibration_value"],
          "applied_dimensions": ["dim_time"],
          "sample_data": [
            {{"name": "10:00", "value": 1.2}},
            {{"name": "10:05", "value": 1.5}}
          ]
        }}
      ]
    }}"""

    if current_model_json and refine_text:
        return f"""You are an Expert Data Visualization Engineer.
        
        Here is the Current AV JSON:
        {current_model_json}
        
        The user has requested the following refinement: "{refine_text}"
        
        CRITICAL RULES:
        1. You MUST apply the user's refinement to the current AV JSON.
        2. Keep all other visualizations intact unless affected by the refinement. 
        3. PRESERVE ALL KEYS: Ensure 'title', 'description', and 'sg_supported' are not lost.
        4. ALLOWED CHART TYPES: 'bar', 'line', 'pie', 'scatter', 'heatmap', 'table', 'radar', 'composed'.
        5. Return ONLY a valid JSON with the root key "visualisations".
        
        {json_template}
        """
        
    return f"""You are an Expert Data Visualization Engineer.
    
    Data Warehouse (MDAM):
    {mdam_json}
    
    Business Requirements (i*):
    {istar_json}
    
    CRITICAL RULES:
    1. For EVERY Task (T) or Information Goal (IG), suggest the most effective chart type.
    2. MANDATORY DIVERSITY: You MUST use a diverse mix of chart types. Match the chart to the data context:
       - Use 'line' or 'composed' for time-series, trends, or evolutions.
       - Use 'pie' to show proportions, distributions, or categorical shares.
       - Use 'scatter' to show relationships or correlations between metrics.
       - Use 'heatmap' for density, schedules, or multidimensional matrices (e.g., Day vs Hour).
       - Use 'table' for exact sequencing, detailed records, or low-level logs.
       - Use 'radar' for multivariate profiling across different axes.
       - Use 'bar' for simple categorical comparisons (DO NOT overuse 'bar').
    3. ALLOWED CHART TYPES: Standardize the 'chart_type' key to ONE of these exact lower-case strings: 'bar', 'line', 'pie', 'scatter', 'heatmap', 'table', 'radar', or 'composed'. 
    4. PROHIBITED: NEVER suggest 'kpi', 'metric', 'gauge', 'area', or 'doughnut'.
    5. DATA MAPPING IS MANDATORY: You MUST include the exact 'source_table', 'applied_metrics', 'applied_dimensions' from the MDAM, and generate realistic 'sample_data' arrays for the frontend to render.
    
    {json_template}
    """

@router.post("/generate")
async def generate_av(req: AvRequest):
    if req.current_model and req.refine_text:
        prompt = build_av_prompt(json.dumps(req.mdam_model), json.dumps(req.istar_model), json.dumps(req.current_model), req.refine_text)
    else:
        prompt = build_av_prompt(json.dumps(req.mdam_model), json.dumps(req.istar_model))
        
    try:
        raw_response = await call_mistral_api(prompt, req.temperature)
        data = extract_json(raw_response)
        
        if isinstance(data, dict):
            if "visualizations" in data:
                data["visualisations"] = data.pop("visualizations")
            elif "av_model" in data and "visualizations" in data["av_model"]:
                data["visualisations"] = data["av_model"]["visualizations"]
            elif "av_model" in data and "visualisations" in data["av_model"]:
                data["visualisations"] = data["av_model"]["visualisations"]
                
        if isinstance(data, list):
            data = {"visualisations": data}
        elif "visualisations" not in data:
            data = {"visualisations": [data]}
            
        return {"status": "success", "av_model": data}
        
    except Exception as e:
        logger.error(f"Erro no AV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))