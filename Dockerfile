# Stage 1: Build
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# Stage 2: Runtime
FROM node:18-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Download and unzip Rhubarb Lip Sync
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip && \
    unzip Rhubarb-Lip-Sync-1.13.0-Linux.zip && \
    rm Rhubarb-Lip-Sync-1.13.0-Linux.zip

# Assuming the executable file is named "Rhubarb-Lip-Sync" and it's in the extracted folder
# You should update this path according to the actual file location
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN npm install --only=production

EXPOSE 3000

CMD ["node", "./dist/index.js"]

