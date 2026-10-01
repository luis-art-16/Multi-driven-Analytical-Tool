"""
===============================================================================
Module: Data-Driven Analytical Model (ddam.py)
Description: 
    Implements the Data-Driven analytical pathway. Receives a Conceptual 
    Model (ERD) and utilizes the LLM to autonomously design a dimensional 
    Constellation or Star schema, strictly segregating facts, metrics, 
    foreign keys, and dimensions.
===============================================================================
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import json
import re
from services.mistral_client import call_mistral_api

router = APIRouter(prefix="/ddam", tags=["DDAM"])

class DdamRequest(BaseModel):
    der_model: Any
    temperature: float = 0.2

def build_ddam_prompt(der_json: str) -> str:
    return f"""You are a Senior Data Warehouse Architect. Convert this Conceptual Model (ERD) into a Dimensional Model (Star or Constellation Schema).
    
    SOURCE ERD JSON:
    {der_json}

    CRITICAL RULES:
    1. Fact tables MUST separate measurable indicators ('metrics') from 'foreign_keys'.
    2. ALL TABLE AND COLUMN NAMES MUST BE IN STRICT ENGLISH.
    3. STRICT STAR SCHEMA ENFORCEMENT (NO SNOWFLAKE):
       - A Dimension table MUST HAVE EXACTLY ONE Primary Key.
       - Dimension tables MUST NOT contain Foreign Keys pointing to other dimensions (e.g., a Store dimension should not contain a City ID as a foreign key).
       - All relationships MUST go directly from the Fact table to the Dimension tables. 
       - If the source ERD has hierarchical dimensions (like Order -> Customer), FLATTEN THEM. The Fact table MUST contain the foreign keys for BOTH Order and Customer directly.
    4. STRICT NAMING CONVENTION: When assigning the 'table_name', you MUST use the exact base entity names from the provided DDCM/Metadata, prefixed by 'fact_' or 'dim_'. DO NOT use synonyms or invent new business names. For example, if the source entity is 'operation', the table MUST be exactly 'fact_operation'. If it is 'consumptionGas', it MUST be exactly 'fact_consumptionGas'. This exact string matching is mandatory for mathematical integration later.

    OUTPUT FORMAT:
    You MUST output ONLY a valid JSON with the following structure. Do not include markdown formatting like ```json.
    {{
       "tables": [
         {{
            "table_type": "fact", 
            "table_name": "fact_sales", 
            "foreign_keys": ["product_sk", "store_sk"], 
            "metrics": ["total_amount", "discount_value"]
         }},
         {{
            "table_type": "dimension", 
            "table_name": "dim_product", 
            "primary_key": "product_sk",
            "attributes": ["product_name", "category"]
         }},
         {{
            "table_type": "dimension", 
            "table_name": "dim_store", 
            "primary_key": "store_sk",
            "attributes": ["store_name", "city"]
         }}
       ]
    }}"""

@router.post("/generate")
async def generate_ddam(req: DdamRequest):
    prompt = build_ddam_prompt(json.dumps(req.der_model))
    try:
        response = await call_mistral_api(prompt, req.temperature)
        match = re.search(r'\{.*\}', response, re.DOTALL)
        
        if not match:
            print(f"Raw response: {response}") 
            raise ValueError("No JSON block found in the AI response.")
            
        json_str = match.group(0)
        dw_schema = json.loads(json_str)
        
        return {"status": "success", "dw_schema": dw_schema}
        
    except json.JSONDecodeError:
        print(f"Parse failure. Original response: {response}")
        raise HTTPException(status_code=500, detail="Mistral returned an invalid JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))