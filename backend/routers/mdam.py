"""
===============================================================================
Module: Multi-Driven Analytical Model (mdam.py)
Description: 
    Core module for merging the Data-Driven (DDAM) and Requirements-Driven 
    (RDAM) analytical models. Computes the mathematical intersection of 
    entities and attributes, preserving SQL data types and assigning 
    provenance tags ('base', 'ddam', 'rdam').
===============================================================================
"""

import json
import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from services.mistral_client import call_mistral_api

logger = logging.getLogger("pipeline_api")
router = APIRouter(prefix="/mdam", tags=["MDAM"])

class MdamRequest(BaseModel):
    ddam_model: Any
    rdam_model: Any
    temperature: float = 0.1

def find_best_ddam_match(rdam_name: str, ddam_keys: list) -> str:
    """
    Semantic Matcher: Força o alinhamento de tabelas do RDAM com o DDAM 
    mesmo que o LLM tenha alucinado nomenclaturas diferentes.
    """
    r_lower = str(rdam_name).lower().strip()
    if r_lower in ddam_keys:
        return r_lower
        
    r_clean = r_lower.replace('fact_', '').replace('dim_', '').strip()
    
   # 1. Exact Substring Match (e.g.: 'operation' inside 'production_operations')
    for d_key in ddam_keys:
        d_clean = d_key.replace('fact_', '').replace('dim_', '').strip()
        if d_clean and r_clean and (d_clean in r_clean or r_clean in d_clean):
            return d_key
            
    # 2. Word Intersection Match (e.g.: "energy_consumption" and "consumption_gas")
    r_words = set(re.split(r'[^a-z]', r_clean))
    r_words.discard('')
    
    for d_key in ddam_keys:
        d_clean = d_key.replace('fact_', '').replace('dim_', '').strip()
        d_words = set(re.split(r'[^a-z]', d_clean))
        d_words.discard('')
        
        # If they share a keyword (e.g.: 'consumption', 'vibration')
        if len(r_words.intersection(d_words)) > 0:
            return d_key
            
    # 3. Generic DW Match (Dates and Times)
    if "time" in r_lower or "date" in r_lower:
        for d_key in ddam_keys:
            if "time" in d_key or "date" in d_key:
                return d_key
                
    return r_lower

def merge_dw_models(ddam_model, rdam_model) -> dict:
    if isinstance(ddam_model, str):
        try: ddam_model = json.loads(ddam_model)
        except: ddam_model = {}
    if isinstance(rdam_model, str):
        try: rdam_model = json.loads(rdam_model)
        except: rdam_model = {}

    def get_tname(t):
        return str(t.get("table_name", t.get("entity", t.get("name", "")))).lower().strip()

    def get_all_cols(t, default_source):
        cols_dict = {}
        
        def add_col(name, ctype, source):
            name = str(name).strip()
            if not name: return
            n_lower = name.lower()
            if n_lower not in cols_dict:
                cols_dict[n_lower] = {"name": name, "type": ctype, "source": source}
            else:
                if ctype and cols_dict[n_lower]["type"] not in ["PK", "FK"]:
                    cols_dict[n_lower]["type"] = ctype
                if source != default_source:
                    cols_dict[n_lower]["source"] = source

        if isinstance(t.get("primary_key"), str):
            add_col(t["primary_key"], "PK", default_source)
            
        if isinstance(t.get("foreign_keys"), list):
            for fk in t["foreign_keys"]:
                if isinstance(fk, str): add_col(fk, "FK", default_source)
                elif isinstance(fk, dict): add_col(fk.get("name", fk.get("column", "")), "FK", fk.get("source", default_source))

        if isinstance(t.get("metrics"), list):
            for m in t["metrics"]:
                if isinstance(m, str): add_col(m, "METRIC", default_source)
                elif isinstance(m, dict): add_col(m.get("name", ""), "METRIC", m.get("source", default_source))

        if isinstance(t.get("attributes"), list):
            for a in t["attributes"]:
                if isinstance(a, str): add_col(a, "ATTR", default_source)
                elif isinstance(a, dict): add_col(a.get("name", ""), "ATTR", a.get("source", default_source))

        if isinstance(t.get("columns"), list):
            for c in t["columns"]:
                if isinstance(c, dict):
                    name = c.get("name", "")
                    ctype = str(c.get("type", "")).upper()
                    if not ctype and (name.lower() in ["id", "key"] or name.lower().endswith("_id") or name.lower().endswith("_sk")):
                        ctype = "PK"
                    add_col(name, ctype, c.get("source", default_source))
                elif isinstance(c, str):
                    add_col(c, "", default_source)

        return list(cols_dict.values())

    # 1. Extract DDAM Tables
    ddam_tables = {get_tname(t): t for t in ddam_model.get("tables", [])} if ddam_model else {}
    
    # 2. Extract RDAM Tables with SEMANTIC MATCHING
    rdam_tables = {}
    if rdam_model:
        for t in rdam_model.get("tables", []):
            raw_name = get_tname(t)
            mapped_name = find_best_ddam_match(raw_name, list(ddam_tables.keys()))
            rdam_tables[mapped_name] = t

    merged_tables = []
    all_table_names = set(ddam_tables.keys()).union(set(rdam_tables.keys()))

    for table_name in all_table_names:
        if not table_name: continue
        in_ddam = table_name in ddam_tables
        in_rdam = table_name in rdam_tables

        if in_ddam and in_rdam:
            table_source = "base"
            ddam_t = ddam_tables[table_name]
            rdam_t = rdam_tables[table_name]
            raw_table_type = str(rdam_t.get("table_type") or ddam_t.get("table_type") or "")
            
            d_cols = get_all_cols(ddam_t, "ddam")
            r_cols = get_all_cols(rdam_t, "rdam")
            
            merged_cols_dict = {}
            for c in d_cols:
                merged_cols_dict[c["name"].lower()] = c
                
            for c in r_cols:
                c_lower = c["name"].lower()
                if c_lower in merged_cols_dict:
                    merged_cols_dict[c_lower]["source"] = "base"
                    if c["type"] and merged_cols_dict[c_lower]["type"] not in ["PK", "FK"]:
                        merged_cols_dict[c_lower]["type"] = c["type"]
                else:
                    merged_cols_dict[c_lower] = c
                    
            merged_columns = list(merged_cols_dict.values())
            
        elif in_ddam:
            table_source = "ddam"
            t = ddam_tables[table_name]
            raw_table_type = str(t.get("table_type") or "")
            merged_columns = get_all_cols(t, "ddam")
        else:
            table_source = "rdam"
            t = rdam_tables[table_name]
            raw_table_type = str(t.get("table_type") or "")
            merged_columns = get_all_cols(t, "rdam")

        original_table_name = ddam_tables.get(table_name, rdam_tables.get(table_name, {})).get("table_name", ddam_tables.get(table_name, rdam_tables.get(table_name, {})).get("entity", table_name))

        fk_list = [c["name"] for c in merged_columns if c["type"] == "FK"]
        pk_str = next((c["name"] for c in merged_columns if c["type"] == "PK"), "")
        metrics_list = [c["name"] for c in merged_columns if c["type"] == "METRIC"]

        # INTELLIGENT STAR SCHEMA CLASSIFICATION
        table_type = "dimension"
        safe_raw_type = raw_table_type.lower()
        if safe_raw_type == "fact":
            table_type = "fact"
        elif safe_raw_type == "dimension":
            table_type = "dimension"
        else:
            if "fact" in str(original_table_name).lower():
                table_type = "fact"
            elif len(metrics_list) > 0:
                table_type = "fact" 
            elif len(fk_list) >= 2 and not pk_str:
                table_type = "fact" 

        merged_tables.append({
            "table_name": original_table_name,
            "table_type": table_type,
            "source": table_source,
            "primary_key": pk_str,
            "foreign_keys": fk_list,
            "columns": merged_columns
        })

    return {
        "tables": merged_tables,
        "hierarchies_and_filters": rdam_model.get("hierarchies_and_filters", []) if isinstance(rdam_model, dict) else [],
        "data_gaps": rdam_model.get("data_gaps", []) if isinstance(rdam_model, dict) else []
    }

@router.post("/generate")
async def generate_mdam(req: MdamRequest):
    try:
        if isinstance(req.rdam_model, str) and req.rdam_model == "":
            prompt = f"You are a Data Warehouse Expert. Refine the following MDAM model based on the instructions.\n{req.ddam_model}\nCRITICAL RULE: Return ONLY a valid JSON with the exact same structure ('tables', 'hierarchies_and_filters', 'data_gaps')."
            response = await call_mistral_api(prompt, req.temperature)
            cleaned = response.strip().strip("`").removeprefix("json").strip()
            return {"status": "success", "final_dw_schema": json.loads(cleaned)}
        
        merged_schema = merge_dw_models(req.ddam_model, req.rdam_model)
        return {"status": "success", "final_dw_schema": merged_schema}
    except Exception as e:
        logger.error(f"Erro no MDAM: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))