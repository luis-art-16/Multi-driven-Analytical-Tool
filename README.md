# A Tool for End-to-End Analytics: From Multi-driven Analytical Modeling to Goal-oriented Data Storytelling
The repository includes the functional prototype developed under a research grant, which focuses on implementing an analytical modeling methodology utilizing Large Language Models (LLMs). The system achieves automation of Data Warehouse creation and the production of storytelling dashboards by combining database schemas (using a data-driven approach) with the strategic business requirements defined in i* (using a requirements-driven approach).

## Demonstration Video:** [Click here to watch the tool in action](https://youtu.be/oj_Ua2Bve58)

## 1. System Architecture
The platform runs entirely in Docker and consists of three main synchronously communicating services:

* **Frontend**: A React-based interface featuring global state management via Zustand and dynamic diagram rendering using ReactFlow.
* **Backend**: An API developed in Python using FastAPI, integrating the logic for model fusion and handling secure communication with both the Mistral AI API and the Resend notification service.
* **Database**: A MongoDB instance dedicated to persisting generated schemas, project metadata, and execution history.

## 2. Requirements & Setup
To run the platform, you must have **Docker Desktop** installed.

## 2.1. Environment Variables and API Keys

In the root folder of the project (where the docker-compose.yml file is located), there is a file called .env.example. This file is provided only as a configuration template and must be renamed to .env before running the project.

To configure the system, follow these steps:

1. Rename the .env.example file to .env.

2. For the platform to work, you need to generate API keys for the two external services used:

    - Mistral AI API: Access the Mistral AI developer portal, create an account, and generate an API key for the natural language processing functionality.

    - Resend API: Access the Resend platform, create an account, and generate an API key for the email notification service.

3. Open the newly renamed .env file in VS Code or another editor of your choice and replace the example values with the API keys you generated, filling in the following fields:

    MISTRAL_API_KEY=your_mistral_api_key
    RESEND_API_KEY=your_resend_api_key

4. Do not modify the MONGO_URL value already defined in the .env file.

IMPORTANT: The file must be named .env. The application does not use the .env.example file directly. This file is only provided as a template for configuring the required environment variables.

After completing these steps, the project will be configured and ready to run using Docker.

### 2.2. Running the Project
From the root directory of the project (where the docker-compose.yml is located), execute the following command in your terminal:

docker-compose up -d --build

### 2.3. Access Points
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

