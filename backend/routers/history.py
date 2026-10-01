"""
===============================================================================
Module: History & Notifications (history.py)
Description: 
    Manages the persistence of generated analytical pipelines (Projects) 
    to MongoDB. Provides endpoints to save, list, and reload previous 
    projects. Integrates with the Resend API via FastAPI BackgroundTasks 
    to dispatch asynchronous email notifications upon project completion.
===============================================================================
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Any
from datetime import datetime
import logging
import os
import motor.motor_asyncio
import resend
import urllib.parse

# Database Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://pipeline_mongo:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client.pipeline_db 

logger = logging.getLogger("pipeline_api")
router = APIRouter(prefix="/history", tags=["History & Emails"])

class SaveProjectRequest(BaseModel):
    email: str = "admin@Multi_drivenAnalyticalTool.pt"
    project_name: str
    pipeline_data: Any

# 1. EMAIL SENDING FUNCTION (Running in Background)
def send_email_task(receiver_email: str, project_name: str, save_time: str):
    resend.api_key = os.getenv("RESEND_API_KEY", "re_your_key_here")
    
    if not resend.api_key or resend.api_key == "re_your_key_here":
        logger.warning("RESEND_API_KEY not configured. Simulating email sending.")
        return

    try:
        email_params = {
            "from": "Multi-driven Analytical Tool Pipeline <onboarding@resend.dev>",
            "to": ["put_your_email_here"], # YOUR DESTINATION EMAIL HERE!
            "subject": f"Multi-driven Analytical Tool - Project '{project_name}' Saved!",
            "html": f"""
            <h3>Congratulations!</h3>
            <p>Your Analytical Pipeline project <strong>"{project_name}"</strong> has been successfully finalized and saved on {save_time}.</p>
            <p>You can log in to the Multi-driven Analytical Tool dashboard at any time to review your Data Warehouse models and Analytical Dashboards.</p>
            <br/>
            <p>Best regards,<br/><strong>Multi-driven Analytical Tool AI Pipeline</strong></p>
            """
        }
        email = resend.Emails.send(email_params)
        logger.info(f"Email successfully sent via Resend: {email.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {str(e)}")

# 2. SAVE PROJECT TO DATABASE
@router.post("/save")
async def save_project(req: SaveProjectRequest, background_tasks: BackgroundTasks):
    try:
        now = datetime.now()
        time_str = now.strftime("%d-%m-%Y %H:%M")
        unique_name = f"{req.project_name} ({time_str})"

        project_doc = {
            "email": req.email,
            "project_name": unique_name,
            "created_at": now,
            "pipeline_data": req.pipeline_data
        }
        
        await db.projects.insert_one(project_doc)
        background_tasks.add_task(send_email_task, req.email, req.project_name, time_str)

        return {"status": "success", "message": "Project saved successfully."}
    except Exception as e:
        logger.error(f"Error saving project: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error while saving.")

# 3. LIST USER PROJECTS
@router.get("/list/{email}")
async def list_projects(email: str):
    try:
        cursor = db.projects.find({"email": email}, {"pipeline_data": 0}).sort("created_at", -1)
        projects = await cursor.to_list(length=100)
        for p in projects: p["_id"] = str(p["_id"])
        return {"status": "success", "projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. LOAD A SPECIFIC PROJECT
@router.get("/load/{full_path:path}")
async def load_project(full_path: str):
    try:
        parts = full_path.rsplit('/', 1)
        
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid route format.")
            
        project_name = parts[0]
        email = parts[1]

        project = await db.projects.find_one({"email": email, "project_name": project_name})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")
            
        project["_id"] = str(project["_id"])
        return {"status": "success", "project": project}
    except Exception as e:
        logger.error(f"Error loading project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# 5. DELETE A PROJECT
@router.delete("/delete/{full_path:path}")
async def delete_project(full_path: str):
    try:
        parts = full_path.rsplit('/', 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid route format.")
        
        project_name = urllib.parse.unquote(parts[0])
        email = urllib.parse.unquote(parts[1])

        result = await db.projects.delete_one({"project_name": project_name, "email": email})
        if result.deleted_count == 1:
            return {"status": "success", "message": "Project deleted successfully."}
        else:
            raise HTTPException(status_code=404, detail="Project not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))