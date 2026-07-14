# BE.NEUTRAL: Multi-Driven Analytical Modeling Pipeline
This repository contains the functional prototype developed as part of a research grant, focusing on the implementation of an analytical modeling methodology assisted by Large Language Models (LLMs). The system automates the creation of Data Warehouses and storytelling dashboards by seamlessly merging database schemas (Data-Driven approach) with strategic business requirements formulated in i* (Requirements-Driven approach).

## 1. System Architecture
The platform runs entirely in Docker and consists of three main synchronously communicating services:

* **Frontend**: A React-based interface featuring global state management via Zustand and dynamic diagram rendering using ReactFlow.
* **Backend**: An API developed in Python using FastAPI, integrating the logic for model fusion and handling secure communication with both the Mistral AI API and the Resend notification service.
* **Database**: A MongoDB instance dedicated to persisting generated schemas, project metadata, and execution history.

## 2. Prerequisites & Setup
To run the platform, you must have **Docker Desktop** installed.

### 2.1. Environment Variables & API Keys
In the '.env' file, you must configure your API keys:

.env
MONGO_URL=mongodb://mongo:27017
MISTRAL_API_KEY=your_mistral_api_key_here
RESEND_API_KEY=your_resend_api_key_here

### 2.2. Running the Project
From the root directory of the project (where the docker-compose.yml is located), execute the following command in your terminal:

Bash
docker-compose up -d --build
2.3. Access Points
Once the containers are running, you can access the services at the following URLs:

User Interface (Frontend): http://localhost:3000

API Documentation (Swagger): http://localhost:8001/docs

### 3. Methodological Pipeline Flow
The system follows a parallel "Y-shaped" pipeline:

DDCM (Data-Driven Conceptual Model): Loading the conceptual schema of the source database (JSON/CSV).

DDAM (Data-Driven Analytical Model): Automatic generation of data-oriented schemas.

RSR (Requirements Structuring and Refinement): Input of business requirements to generate the hierarchical i* model or input your i* model already generated.

RDAM (Requirements-Driven Analytical Model): Generation of the analytical model strictly oriented towards decision-making needs.

MDAM (Multi-Driven Analytical Model): The semantic fusion of the DDAM and RDAM models. This step preserves SQL data types and highlights intersections and data gaps.

AV & VO (Analytical Visualizations & Visualizations Organization): Intelligent suggestion of analytical metrics and dimensions, concluding with the rendering of the final interactive dashboard.