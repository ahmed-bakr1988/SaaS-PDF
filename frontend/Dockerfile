# ---- Build Stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine AS production

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ---- Development Stage ----
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
