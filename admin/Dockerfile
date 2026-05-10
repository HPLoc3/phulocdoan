FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose port
EXPOSE 5173

# Run vite with host 0.0.0.0 to be accessible from outside container
CMD ["npx", "vite", "--host"]
