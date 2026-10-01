## BE.NEUTRAL: PIPELINE

    Esta pasta contém o protótipo funcional desenvolvido no âmbito de uma bolsa de investigação, focado na implementação de uma metodologia de modelação analítica assistida por Large Language Models (LLMs). O sistema automatiza a criaçaõ de Data Warehouses e dashboards narrativos através da junção de esquemas de bases de dados (Via Data-Driven) e requisitos estratégicos de negócio formulados em i* (Via Requirements-Driven).

## Demonstration Video:** [Click here to watch the tool in action](https://youtu.be/oj_Ua2Bve58)


 ## 1. Arquitetura do Sistema
A plataforma encontra-se a correr totalmente em Docker, sendo composta por três serviços principais que comunicam de forma síncrona:

    - Frontend: Interface desenvolvida em React com gestão de estado via Zustand e renderização de diagramas dinâmicos através de ReactFlow.

    - Backend: API desenvolvida em FastAPI (Python) que integra a lógica de fusão de modelos e a comunicação com a API da Mistral AI e o serviço de notificações Resend.

    - Database: Instância de MongoDB para a persistência de esquemas gerados, metadados dos projetos e histórico de execuções.

## 2. Pré-requisitos e Configuração
    Para a execução da plataforma, é necessária a instalar o Docker Desktop e a obter as chaves API para os serviços externos utilizados.

## 2.1. Variáveis de Ambiente e Chaves de API
    Na pasta principal do projeto (onde se encontra o ficheiro docker-compose.yml), encontra-se um ficheiro chamado .env.example. Para configurar o sistema, siga estes passos:

    1. Mude o nome de .env.example para apenas .env

    2. Para que a plataforma funcione, necessita de gerar duas chaves de acesso (gratuitas) para os serviços externos utilizados:

        - API da Mistral AI: Aceda ao portal para developers da Mistral AI, crie uma conta e gere uma chave de API para o processamento de linguagem natural.

        - API do Resend: Aceda ao portal do Resend, crie uma conta e gere uma chave de API para o serviço de envio de emails.

    3. Abra o novo ficheiro .env no VScode ou outra plataforma à escolha e cole as chaves que gerou à frente dos campos MISTRAL_API_KEY= e RESEND_API_KEY=. Não altere o valor do MONGO_URL que já lá se encontra.


## 2.2. Execução do Projeto
    A partir da raiz do projeto (onde se localiza o ficheiro docker-compose.yml), execute o seguinte comando no terminal:
        
        docker-compose up -d --build 

## 2.3. Pontos de Acesso
      -  Interface de Utilizador (Frontend): http://localhost:3000

      -  Documentação da API (Swagger): http://localhost:8000/docs   

## 3. Fluxo Metodológico da Pipeline
    O sistema segue o pipeline paralelo em "Y" descrito na metodologia proposta:

    DDCM (Data-Driven Conceptual Model): Carregamento do esquema conceptual da base de dados fonte (JSON/CSV).

    DDAM (Data-Driven Analytical Model): Geração automática de esquemas i* orientados aos dados disponíveis (representação visual a azul).

    RSR (Requirements Structuring and Refinement): Introdução de requisitos de negócio para geração do modelo i*.

    RDAM (Requirements-Driven Analytical Model): Geração do modelo analítico orientado às necessidades de decisão (representação visual a laranja).

    MDAM (Multi-Driven Analytical Model): Fusão dos modelos DDAM e RDAM, preservando tipos de dados SQL e destacando interseções e lacunas de dados (representação visual de acordo com as ligações com as tabelas já geradas).

    AV & VO (Analytical Visualizations & Visualizations Organization): Sugestão de métricas e dimensões analíticas seguida da renderização do dashboard final organizado por objetivos estratégicos.

## 4. Nota para Desenvolvimento Local (Opcional)

Como o projeto está todo em docker, **não é necessário** configurar o ambiente localmente para executar a aplicação. No entanto, caso pretenda explorar o código do backend no seu IDE com suporte a *linting* e *autocomplete*, pode criar um ambiente virtual Python:

1. Navegue para a pasta do backend: `cd backend`
2. Crie o ambiente virtual: `python -m venv venv`
3. Ative o ambiente: 
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Instale as dependências: `pip install -r requirements.txt`

