"""
===============================================================================
Module: Database Connection Management (database.py)
Description: 
    Handles asynchronous connections to the MongoDB database using the Motor 
    engine. Manages the connection lifecycle (initialization, retrieval, and 
    teardown) to ensure efficient resource usage across the FastAPI application.
===============================================================================
"""

import motor.motor_asyncio
from core.config import settings, logger

# Global database client and instance variables
client = None
db = None

async def init_db():
    """
    Initializes the async connection to MongoDB and verifies the server status.
    Called during the startup event of the FastAPI application.
    """
    global client, db
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.MONGO_DB_NAME]
        
        # Ping the server to verify the connection is active
        await client.server_info()
        logger.info(f"Connected to MongoDB: {settings.MONGO_DB_NAME}")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise e

async def close_db():
    """
    Safely closes the MongoDB connection.
    Called during the shutdown event of the FastAPI application.
    """
    global client
    if client:
        client.close()
        logger.info("Connection to MongoDB closed.")

def get_db():
    """
    Dependency function to retrieve the active database instance.
    Raises an exception if called before the database is initialized.
    """
    global db
    if db is None:
        raise Exception("Database not initialized.")
    return db