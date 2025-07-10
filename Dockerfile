# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS builder

# Declare build argument that can be passed from docker-compose.yml
ARG GEMINI_API_KEY

# Set the build argument as an environment variable within this builder stage
# This makes it accessible to process.env.GEMINI_API_KEY during npm run build
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json ./

# Install dependencies
# All dependencies (including devDependencies like Vite) are needed for the build
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Vite application
# GEMINI_API_KEY (from ENV above) will be available to vite.config.ts here
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy built assets from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY package.json package-lock.json ./

# We need 'express' to run the server.js, so install production dependencies.
# If server.js had no external dependencies, this could be skipped by copying node_modules too.
# However, it's cleaner to install only what's needed for production.
RUN npm install --omit=dev --production

# Copy the server.js file (will be created in the next step)
COPY server.js .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]
