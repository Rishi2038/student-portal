FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose standard port
EXPOSE 3000

# Default environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start application
CMD ["node", "server.js"]
