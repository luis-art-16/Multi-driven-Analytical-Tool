"""
===============================================================================
Module: Requirements-Driven Analytical Model (rdam.py)
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
router = APIRouter(prefix="/rdam", tags=["RDAM"])

class RdamRequest(BaseModel):
    der_model: Any
    istar_model: Any
    temperature: float = 0.2

def build_rdam_prompt(der_json: str, istar_json: str) -> str:
    return f"""You are a Senior Data Warehouse Architect. Propose an analytical data model based on the conceptual data model and the user requirements.
    
    REQUIREMENTS (i* Model):
    {istar_json}

    SOURCE DATA (Conceptual ERD):
    {der_json}

    CRITICAL RULES:
    1. Identify fact tables that meet the IGs, and define dimension tables for contextual information.
    2. STRICT STAR SCHEMA ENFORCEMENT (NO SNOWFLAKE):
       - A Dimension table MUST HAVE EXACTLY ONE Primary Key.
       - Dimension tables MUST NOT contain Foreign Keys pointing to other dimensions.
       - All relationships MUST go directly from the Fact table to the Dimension tables.
    3. TRACEABILITY: Every Information Goal (IG) from the i* model MUST be mapped in the task_data_mapping block.
    4. DATA GAPS: If an IG requires data NOT present in the ERD, add it to 'data_gaps' proposing a mitigation strategy. 
       YOU MUST ALWAYS GENERATE EXACTLY THESE 4 KEYS IN EACH GAP: "gap_id", "description", "impact", "mitigation_strategy". Do not omit any key.

    OUTPUT FORMAT:
    You MUST output ONLY a valid JSON with the following structure:
    {{
       "tables": [
         {{
            "table_type": "fact", 
            "table_name": "fact_vibration", 
            "primary_key": "vibration_fact_id",
            "foreign_keys": ["sensor_id", "machine_id", "time_id"],
            "metrics": ["vibration_value"],
            "description": "..."
         }}
       ],
       "ig_support": [
         {{
            "information_goal": "Monitor vibrations over time",
            "tasks": ["T1"]
         }}
       ],
       "hierarchies_and_filters": [
         {{
            "dimension": "dim_time",
            "hierarchy": "Year > Month > Day > Hour"
         }}
       ],
       "data_gaps": [
         {{
            "gap_id": "GAP-1",
            "description": "Describe the missing data",
            "impact": "Describe the business impact",
            "mitigation_strategy": "Suggest a specific solution"
         }}
       ],
       "task_data_mapping": [
         {{
           "task_id": "T1",
           "data_sources": ["vibr_monitor_YYYY_MMDD.csv"],
           "attributes": ["Time", "Tool"],
           "metrics": ["V1-V12", "Temp"]
         }}
       ]
    }}"""

@router.post("/generate")
async def generate_rdam(req: RdamRequest):
    try:
        der_str = req.der_model if isinstance(req.der_model, str) else json.dumps(req.der_model)
        istar_str = req.istar_model if isinstance(req.istar_model, str) else json.dumps(req.istar_model)
        
        prompt = build_rdam_prompt(der_str, istar_str)
        response = await call_mistral_api(prompt, req.temperature)
        
        cleaned_response = re.sub(r'```json\s*', '', response)
        cleaned_response = re.sub(r'```\s*', '', cleaned_response)
        
        match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
        if not match:
            raise ValueError("Invalid JSON response from AI.")
            
        json_str = match.group(0)
        dw_schema = json.loads(json_str)
        
        return {"status": "success", "dw_schema": dw_schema}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="The AI generated invalid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))