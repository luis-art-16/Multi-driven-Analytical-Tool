"""
===============================================================================
Module: Data-Driven Conceptual Model (ddcm.py)
Description: 
    Entry point for the Data-Driven pathway. Accepts raw CSV file uploads, 
    extracts structural metadata and data samples using Pandas, and leverages 
    the LLM to infer a strict 3rd Normal Form (3NF) Entity-Relationship Model.
===============================================================================
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import pandas as pd
import io
import json
from services.mistral_client import call_mistral_api

router = APIRouter(prefix="/ddcm", tags=["DDCM"])

def build_ddcm_prompt(schemas_info: str) -> str:
    return f"""You are an expert Database Architect. Based on the following CSV file schemas (headers and sample data), generate a Conceptual Entity-Relationship Model (ERD) in strictly 3rd Normal Form (3NF).
    
    SOURCE DATA:
    {schemas_info}
    
    CRITICAL RULES:
    1. The conceptual model can ONLY include entities, attributes, and relationships inferred from the available metadata.
    2. EXCLUDE EVENTS AS ENTITIES: Entities of the domain have events that are occurrences of the activities that affect entities over time. These events or activities CANNOT be considered entities of the domain.
    3. Define Primary Keys (PK) and Foreign Keys (FK).
    
    OUTPUT EXACTLY IN THIS JSON FORMAT:
    [
      {{
        "entity": "table_name",
        "columns": ["col1 (PK)", "col2", "col3 (FK)"],
        "relations": [
            {{"related_to": "other_table", "type": "1-N"}}
        ]
      }}
    ]"""

@router.post("/generate")
async def generate_ddcm(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    
    schemas_info = ""
    
    try:
        # Reads CSV files and extracts headers for AI context
        for file in files:
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents), nrows=3) # Reads only 3 lines to save tokens and optimize time
            
            schemas_info += f"\n--- File: {file.filename} ---\n"
            schemas_info += f"Columns: {', '.join(df.columns.tolist())}\n"
            schemas_info += f"Sample Data:\n{df.to_json(orient='records')}\n"
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSVs: {str(e)}")

    # Prepares the prompt and calls Mistral
    prompt = build_ddcm_prompt(schemas_info)
    
    try:
        response_text = await call_mistral_api(prompt, temperature=0.1)
        
        # Cleans Mistral's output in case it includes markdown
        cleaned = response_text.strip().strip("`").removeprefix("json").strip()
        der_json = json.loads(cleaned)
        
        return {"status": "success", "der_model": der_json}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Mistral returned an invalid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in AI: {str(e)}")