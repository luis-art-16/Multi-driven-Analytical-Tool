"""
===============================================================================
Module: Requirements Structuring and Refinement (rsr.py)
Description: 
    Entry point for the Requirements-Driven pathway. Processes natural language 
    business requirements and translates them into a formal Goal-Oriented 
    i* framework model. Classifies requirements into Strategic Goals, Decision 
    Goals, Information Goals, and Tasks, assigning MoSCoW prioritization.
===============================================================================
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
from services.mistral_client import call_mistral_api

router = APIRouter(prefix="/rsr", tags=["RSR"])

class RsrRequest(BaseModel):
    input_text: str
    temperature: float = 0.2

# Bulletproof function to clean the LLM output (removes Markdown and extra text)
def extract_json(response: str):
    try:
        if "```" in response:
            blocks = response.split("```")
            for block in blocks:
                if "{" in block or "[" in block:
                    block = block.replace("json\n", "", 1).strip()
                    return json.loads(block)
        
        match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if match:
            return json.loads(match.group(1))
            
        return json.loads(response)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON. Error: {e}")

def build_istar_prompt(input_text: str) -> str:
    return f"""You are an expert Requirements Engineer using the i* framework for Data Warehousing.
    
    BACKGROUND KNOWLEDGE:
    - Strategic Goals (SGs) are related to the main objectives of the business process that are being enhanced, representing a desired change from a current situation to a future one. 
    - Decision Goals (DGs) represent decisions that use information to provide benefits for the organization, operationalizing the SGs into actions by answering the question, "How can a strategic goal be achieved?". 
    - Information Goals (IGs) guide the information needed to achieve a DG by responding to the question, "How can decision goals be achieved in terms of information required?". IGs outline the data that must be gathered, usually through analysis. 
    - Tasks (T) represent the specific actions, calculations, or analytical processes to decompose IGs.

    Analyze the following set of user analytical requirements and suggest an i* model to represent them. For the derived SGs, DGs and IGs, classify them as "Must have", "Should have" or "Could have", matching the classification provided in the requirements.

    USER ANALYTICAL REQUIREMENTS:
    {input_text}

    CRITICAL RULES:
    1. Identify the Main Actor (e.g., Manager, User) and the Target System.
    2. Decompose the request mapping to these specific types, enforcing a STRICT 4-LEVEL HIERARCHY:
       - Level 1: "Strategic Goal" 
       - Level 2: "Decision Goal" 
       - Level 3: "Information Goal" 
       - Level 4: "Task" 
    3. HIERARCHY LINKING: The elements MUST be strictly linked. A Decision Goal descends from a Strategic Goal. An Information Goal descends from a Decision Goal. A Task descends from an Information Goal. Do not skip levels.
    4. You MUST include a "parent" field in each dependency containing the exact "dependum" string of its parent. For Strategic Goals, "parent" is null.
    5. You MUST assign a "priority" to every dependency using the MoSCoW method: "Must have", "Should have", or "Could have".
    6. ALL OUTPUT TEXT MUST BE IN STRICT ENGLISH.

    CRITICAL OUTPUT INSTRUCTIONS:
    You MUST output ONLY a valid JSON object representing the i* model. The JSON MUST strictly follow this schema to map the dependencies:
    {{
      "actors": [
        {{ "id": "a1", "name": "Decision-maker", "type": "Role" }},
        {{ "id": "a2", "name": "Manufacturing System", "type": "Target System" }}
      ],
      "dependencies": [
        {{ "depender": "Decision-maker", "dependee": "Manufacturing System", "dependum": "[Name of Goal/Task] (Must/Should/Could have)", "type": "Strategic Goal", "priority": "Must have", "parent": null }},
        {{ "depender": "Decision-maker", "dependee": "Manufacturing System", "dependum": "[Name of Goal/Task]", "type": "Decision Goal", "priority": "Must have", "parent": "[Parent Name]" }},
        {{ "depender": "Decision-maker", "dependee": "Manufacturing System", "dependum": "[Name of Goal/Task]", "type": "Information Goal", "priority": "Must have", "parent": "[Parent Name]" }},
        {{ "depender": "Decision-maker", "dependee": "Manufacturing System", "dependum": "[T1 - Monitor...]", "type": "Task", "priority": "Must have", "parent": "[Parent Name]" }}
      ]
    }}
    Ensure EVERY SINGLE one of the Tasks provided in the input is listed and properly linked to its parent IG, DG, and SG.
    """
    
@router.post("/generate")
async def generate_rsr(req: RsrRequest):
    prompt = build_istar_prompt(req.input_text)
    try:
        response = await call_mistral_api(prompt, req.temperature)
        data = extract_json(response)
        
        # Extra safety validation: If the AI did not generate dependencies, we create an empty list
        if "dependencies" not in data:
            data["dependencies"] = []
            
        return {"status": "success", "istar_model": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error while processing RSR: {str(e)}")