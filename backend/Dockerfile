# Use a Node.js base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install backend dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Specify the port the app runs on
EXPOSE 5000

# Run the backend server
CMD ["node", "server.js"]