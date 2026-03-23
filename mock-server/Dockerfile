FROM node:20-alpine

WORKDIR /app

# Install dependencies for tsx
RUN npm install -g tsx typescript

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start mock server
CMD ["tsx", "index.ts"]
