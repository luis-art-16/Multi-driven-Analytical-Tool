# ============================================================================
# Dockerfile: Frontend (Vite/React)
# Description: Builds the Node environment, installs dependencies, and serves 
# the React application using Vite's development server exposed to the network.
# ============================================================================

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]