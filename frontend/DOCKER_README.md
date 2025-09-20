# ORMS Frontend Docker Setup

This directory contains Docker configurations for running the ORMS React frontend in both development and production environments.

## 🐳 Docker Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile.dev` | Development environment with hot reload |
| `Dockerfile.prod` | Production environment with nginx |
| `docker-compose.dev.yml` | Development services configuration |
| `docker-compose.prod.yml` | Production services with backend |
| `docker-run.sh` | Convenience script for managing containers |

## 🚀 Quick Start

### Development Mode
```bash
# Start development environment
./docker-run.sh dev up

# View logs
./docker-run.sh dev logs

# Open shell
./docker-run.sh dev shell

# Stop
./docker-run.sh dev down
```

### Production Mode
```bash
# Start production environment
./docker-run.sh prod up

# View logs
./docker-run.sh prod logs

# Stop
./docker-run.sh prod down
```

## 🔧 Environment Configurations

### Development Environment
- **Server**: Webpack Dev Server with hot reload
- **Port**: 3000
- **Source Maps**: ✅ Enabled
- **Hot Reload**: ✅ Source code mounted as volume
- **API URL**: `http://localhost:5000/api`
- **Environment**: `NODE_ENV=development`

### Production Environment
- **Server**: Nginx serving static files
- **Port**: 80
- **Source Maps**: ❌ Disabled
- **Optimized Build**: ✅ Minified and optimized
- **API URL**: `/api` (proxied to backend)
- **Environment**: `NODE_ENV=production`

## 📋 Environment Variables

### Development (.env.development)
```bash
NODE_ENV=development
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_API_URL=http://localhost:5000
GENERATE_SOURCEMAP=true
FAST_REFRESH=true
REACT_APP_ENABLE_LOGGING=true
REACT_APP_ENABLE_DEBUG=true
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Production (.env.production)
```bash
NODE_ENV=production
REACT_APP_API_BASE_URL=/api
REACT_APP_API_URL=/api
GENERATE_SOURCEMAP=false
REACT_APP_NODE_ENV=production
REACT_APP_ENABLE_LOGGING=false
REACT_APP_ENABLE_DEBUG=false
REACT_APP_SOCKET_URL=/
```

## 🛠 Manual Docker Commands

### Development
```bash
# Build development image
docker build -f Dockerfile.dev -t orms-frontend-dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules orms-frontend-dev

# With docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

### Production
```bash
# Build production image
docker build -f Dockerfile.prod -t orms-frontend-prod .

# Run production container
docker run -p 80:80 orms-frontend-prod

# With docker-compose
docker-compose -f docker-compose.prod.yml up --build
```

## 🔍 Health Checks

Both environments include health checks:

- **Development**: `GET http://localhost:3000/`
- **Production**: `GET http://localhost:80/`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## 🌐 Full-Stack Setup

### Development Full-Stack
From the root directory:
```bash
docker-compose -f docker-compose.full-stack.dev.yml up --build
```

This starts:
- Frontend (React Dev Server) on port 3000
- Backend (Flask) on port 5000
- SQLite database

### Production Full-Stack
From the root directory:
```bash
# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with production values

docker-compose -f docker-compose.full-stack.prod.yml up --build
```

This starts:
- Frontend (Nginx) on port 80
- Backend (Gunicorn) on port 5000
- PostgreSQL database

## 📝 Development Workflow

1. **Start development environment**:
   ```bash
   ./docker-run.sh dev up
   ```

2. **Make code changes** - they'll be automatically reflected (hot reload)

3. **View logs** to debug:
   ```bash
   ./docker-run.sh dev logs
   ```

4. **Access shell** for package management:
   ```bash
   ./docker-run.sh dev shell
   npm install new-package
   ```

5. **Stop when done**:
   ```bash
   ./docker-run.sh dev down
   ```

## 🚀 Production Deployment

1. **Build optimized frontend**:
   ```bash
   ./docker-run.sh prod build
   ```

2. **Deploy**:
   ```bash
   ./docker-run.sh prod up
   ```

3. **Monitor**:
   ```bash
   ./docker-run.sh prod logs
   ```

## 🐛 Troubleshooting

### Development Issues
- **Port 3000 in use**: Stop other React servers or change port
- **Hot reload not working**: Check volume mounts in docker-compose.dev.yml
- **Module not found**: Rebuild container to install new dependencies

### Production Issues
- **Build failures**: Check webpack.config.js and ensure all dependencies are installed
- **API calls failing**: Verify nginx proxy configuration
- **Static files not loading**: Check nginx configuration and build output

### Common Commands
```bash
# View running containers
docker ps

# View container logs
docker logs orms-frontend-dev

# Clean up containers and images
docker system prune -a

# Rebuild without cache
./docker-run.sh [dev|prod] build

# Access container shell
./docker-run.sh [dev|prod] shell
```

## 📦 Package Management in Development

When adding new packages in development:

```bash
# Access container shell
./docker-run.sh dev shell

# Install new package
npm install package-name

# Or install and save to package.json
npm install --save package-name

# Exit shell
exit

# Rebuild container to persist changes
./docker-run.sh dev build
```

## 🔧 Nginx Configuration

The production build includes an nginx configuration that:
- Serves static React files
- Proxies `/api/*` requests to the backend
- Handles client-side routing with `try_files`
- Sets appropriate headers for caching

If you need to customize nginx configuration, edit the nginx settings in `Dockerfile.prod`.

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Docker Best Practices](https://create-react-app.dev/docs/deployment/#docker)
- [Nginx Configuration](https://nginx.org/en/docs/)