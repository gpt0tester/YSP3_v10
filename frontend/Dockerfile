# Use a Node.js base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install frontend dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the frontend code
COPY . .

# Build the React app for production
RUN npm run build

CMD ["bash"]

# Use an Nginx image to serve the built React app
FROM nginx:alpine

# Copy the build result to the Nginx web directory
COPY --from=0 /app/build /usr/share/nginx/html

# Copy default Nginx configuration
# COPY nginx.conf /etc/nginx/nginx.conf

# Inject environment variables at runtime
COPY env.sh /docker-entrypoint.d/

RUN chmod +x /docker-entrypoint.d/env.sh

ENTRYPOINT ["/docker-entrypoint.d/env.sh"]

# Expose port 80 for the frontend
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]