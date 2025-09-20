# ORMS Backend Docker Setup

This directory contains Docker configurations for running the ORMS backend in both development and production environments.

## 🐳 Docker Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile.dev` | Development environment with hot reload |
| `Dockerfile.prod` | Production environment with Gunicorn |
| `docker-compose.dev.yml` | Development services configuration |
| `docker-compose.prod.yml` | Production services with PostgreSQL |
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
# Ensure .env file exists with production variables
cp .env.example .env
# Edit .env with your production values

# Start production environment
./docker-run.sh prod up

# View logs
./docker-run.sh prod logs

# Stop
./docker-run.sh prod down
```

## 🔧 Environment Configurations

### Development Environment
- **Database**: SQLite (persisted in `./instance/`)
- **Hot Reload**: ✅ Source code mounted as volume
- **Debug Mode**: ✅ Enabled
- **Port**: 5000
- **Environment**: `FLASK_ENV=development`

### Production Environment
- **Database**: PostgreSQL (separate container)
- **Hot Reload**: ❌ Disabled
- **Debug Mode**: ❌ Disabled
- **Web Server**: Gunicorn with 4 workers
- **Port**: 5000
- **Environment**: `FLASK_ENV=production`

## 📋 Environment Variables

### Development (.env.development)
```bash
DATABASE_URL=sqlite:///instance/orms_dev.db
FLASK_ENV=development
ADMIN_SECRET=admin123
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
JWT_SECRET_KEY=dev-jwt-secret-key
SECRET_KEY=dev-secret-key
```

### Production (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_HOST=postgres-prod
DB_PORT=5432
DB_USER=orms_user
DB_PASSWORD=your_password
DB_NAME=orms_db

# Security
JWT_SECRET_KEY=your_jwt_secret
SECRET_KEY=your_flask_secret
ADMIN_SECRET=admin123

# External Services
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...
ZOOM_CLIENT_ID=your_zoom_client_id
# ... other production variables
```

## 🛠 Manual Docker Commands

### Development
```bash
# Build development image
docker build -f Dockerfile.dev -t orms-backend-dev .

# Run development container
docker run -p 5000:5000 -v $(pwd):/app orms-backend-dev

# With docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

### Production
```bash
# Build production image
docker build -f Dockerfile.prod -t orms-backend-prod .

# Run with environment variables
docker run --env-file .env -p 5000:5000 orms-backend-prod

# With docker-compose
docker-compose -f docker-compose.prod.yml up --build
```

## 🔍 Health Checks

Both environments include health checks:

- **Development**: `GET /api/test`
- **Production**: `GET /api/test`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

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

4. **Access shell** for debugging:
   ```bash
   ./docker-run.sh dev shell
   ```

5. **Stop when done**:
   ```bash
   ./docker-run.sh dev down
   ```

## 🚀 Production Deployment

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
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
- **Port 5000 in use**: Stop the regular Python server first
- **Database errors**: Check SQLite file permissions in `./instance/`
- **Module not found**: Rebuild container with `./docker-run.sh dev build`

### Production Issues
- **Database connection**: Ensure PostgreSQL container is healthy
- **Environment variables**: Check `.env` file exists and has correct values
- **Performance**: Monitor container resources with `docker stats`

### Common Commands
```bash
# View running containers
docker ps

# View container logs
docker logs orms-backend-dev

# Clean up all containers and images
docker system prune -a

# Rebuild without cache
./docker-run.sh [dev|prod] build
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Flask in Docker Best Practices](https://flask.palletsprojects.com/en/2.3.x/deploying/docker/)