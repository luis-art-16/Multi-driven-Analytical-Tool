# A Tool for End-to-End Analytics: From Multi-driven Analytical Modeling to Goal-oriented Data Storytelling
The repository includes the functional prototype developed under a research grant, which focuses on implementing an analytical modeling methodology utilizing Large Language Models (LLMs). The system achieves automation of Data Warehouse creation and the production of storytelling dashboards by combining database schemas (using a data-driven approach) with the strategic business requirements defined in i* (using a requirements-driven approach).

## Demonstration Video:** [Click here to watch the tool in action](https://youtu.be/oj_Ua2Bve58)

## 1. System Architecture
The platform runs entirely in Docker and consists of three main synchronously communicating services:

* **Frontend**: A React-based interface featuring global state management via Zustand and dynamic diagram rendering using ReactFlow.
* **Backend**: An API developed in Python using FastAPI, integrating the logic for model fusion and handling secure communication with both the Mistral AI API and the Resend notification service.
* **Database**: A MongoDB instance dedicated to persisting generated schemas, project metadata, and execution history.

The three services communicate through Docker's internal network, while the Frontend and Backend are exposed through configurable host ports.

## 2. Requirements & Setup
To run the platform, Docker must be installed on the host machine.

For Windows and macOS, **Docker Desktop** can be used. On Linux servers, Docker Engine and Docker Compose can be used directly.

## 2.1. Environment Variables and API Keys

In the root folder of the project (where the docker-compose.yml file is located), there is a file called .env.example. This file is provided only as a configuration template and must be renamed to .env before running the project.

To configure the system, follow these steps:

1. Rename the .env.example file to .env.

2. For the platform to work, you need to generate API keys for the two external services used:

    - **Mistral AI API**: Access the Mistral AI developer portal, create an account, and generate an API key for the natural language processing functionality.

    - **Resend API**: Access the Resend platform, create an account, and generate an API key for the email notification service.

3. Open the newly renamed .env file in a code editor of your choice and replace the example values with the API keys you generated, filling in the following fields:

MONGO_URL=mongodb://mongo:27017 
MONGO_DB_NAME=pipeline_db 

FRONTEND_URL=http://localhost:3001 

MISTRAL_API_KEY=your_mistral_api_key 
MISTRAL_MODEL=ministral-8b-2512 
MISTRAL_TEMPERATURE_DEFAULT=0.2 

EMAIL_ENABLED=false 
RESEND_API_KEY=your_resend_api_key 
EMAIL_FROM_NAME=your_sender_name 
EMAIL_SENDER=your_sender_email

The exact values for the environment variables may be adapted according to the deployment environment.

IMPORTANT: 
* The file must be named .env. The application does not use the .env.example file directly.
* This file is only provided as a template for configuring the required environment variables.
* The .env.example file is provided only as a template.
* The MONGO_URL value should point to the MongoDB service defined in docker-compose.yml.
* The Mistral model can be changed according to the models available for the configured Mistral AI account.

After completing these steps, the project will be configured and ready to run using Docker.

## 2.2. Running the Project
From the root directory of the project (where the docker-compose.yml is located), execute the following command in your terminal:

docker-compose up -d --build

To verify that the containers are running:

docker compose ps

To inspect the application logs:

docker compose logs

Individual services can also be inspected using:

docker compose logs backend
docker compose logs frontend
docker compose logs mongo

## 2.3. Access Points
Once the containers are running, you can access the services at the following URLs:

* User Interface (Frontend): http://localhost:3001
* API: http://localhost:8002
* API Documentation (Swagger): http://localhost:8002/docs

The ports above correspond to the current Docker Compose configuration and can be changed if required by the deployment environment.

## 3. Methodological Pipeline Flow
The system follows a parallel Y-shaped analytical pipeline, combining data-driven and requirements-driven perspectives.

## 3.1. DDCM — Data-Driven Conceptual Model

The process starts by loading the conceptual schema of the source database, provided in JSON/CSV format.

## 3.2. DDAM — Data-Driven Analytical Model

The system automatically generates an analytical model based on the available data structures and source database schema.

## 3.3. RSR — Requirements Structuring and Refinement

Business requirements are introduced and structured to generate a hierarchical i* model. Alternatively, an existing i* model can be provided as input.

## 3.4. RDAM — Requirements-Driven Analytical Model

The system generates an analytical model oriented towards the decision-making requirements identified in the requirements-driven branch.

## 3.5. MDAM — Multi-Driven Analytical Model

The DDAM and RDAM models are semantically fused into a Multi-Driven Analytical Model.

This stage combines the information obtained from the data-driven and requirements-driven approaches while preserving relevant SQL data types and identifying intersections and data gaps between the two perspectives.

## 3.6. AV — Analytical Visualization

The Analytical Visualization stage uses the resulting analytical model to intelligently suggest relevant analytical metrics and dimensions for data analysis.

The generated information is subsequently used as input for the visualization stage.

## 3.7. VO — Visualization Organization

The Visualization Organization stage organizes the selected analytical elements and supports the generation of the final interactive storytelling dashboard.

## 4. Main Technologies

The prototype is implemented using the following technologies:

* Frontend: React, Zustand, ReactFlow, Vite
* Backend: Python, FastAPI
* Database: MongoDB
* LLM Integration: Mistral AI API
* Email Notifications: Resend API
* Containerization: Docker and Docker Compose

## 5. Project Structure

The main components of the repository are organized as follows:

.
├── backend/
│   ├── routers/
│   ├── services/
│   └── ...
├── frontend/
│   └── ...
├── docker-compose.yml
├── .env.example
└── README.md

The Backend contains the API endpoints and analytical processing logic, while the Frontend contains the user interface and visualization components.

## 6. Deployment and Testing

The application can be deployed using Docker Compose in both local development environments and Linux server environments.

For server deployments, the host ports defined in docker-compose.yml can be adapted when other applications are already using the default ports.

The application should be verified after deployment by checking:

1. Docker container status.
2. Backend API availability.
3. Frontend accessibility.
4. MongoDB connectivity.
5. Successful execution of the DDAM, RDAM, MDAM and AV stages.

The current implementation has been tested with the complete Docker-based architecture and the main analytical pipeline stages.

## 7. License and Research Context

This repository contains a functional research prototype developed in the context of a research grant. Its implementation and documentation may evolve as the research work progresses.
