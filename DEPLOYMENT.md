# Othello Deployment Guide

This guide covers the complete deployment setup for the Othello game using GitHub Actions, Docker, and Traefik.

## 🚀 Overview

The deployment system provides:
- **Automated CI/CD** via GitHub Actions
- **Docker containerization** for consistent deployment
- **Traefik integration** for SSL/TLS and reverse proxy
- **Version tracking** with build information
- **Health monitoring** and automatic restarts
- **Local testing** capabilities

## 📋 Prerequisites

### VPS/Server Requirements
- Docker and Docker Compose installed
- Traefik running and configured
- SSH access configured
- Domain name pointing to your server

### GitHub Configuration
- Repository with appropriate permissions
- GitHub Secrets configured (see below)

## 🔧 Initial Setup

### 1. Server Setup

**Install Docker and Docker Compose:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose (if not included)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
```

**Set up Traefik (if not already running):**
```bash
# Create traefik network
docker network create traefik

# Basic Traefik configuration
mkdir -p /var/traefik
# Configure traefik.yml and docker-compose.yml for Traefik
```

### 2. Clone Repository on Server

```bash
# Clone to deployment directory in user's home directory
cd ~
git clone https://github.com/yourusername/othello.git
cd othello
```

### 3. Configure Environment Files

**Production configuration:**
```bash
# Copy example file
cp .env.production.example .env.production

# Edit with your domain and settings
nano .env.production
```

**Example `.env.production`:**
```bash
# Domain configuration
DOMAIN=othello.yourdomain.com

# Node.js server configuration
NODE_ENV=production
PORT=3000
ROOT_DIR=/app
HOST=0.0.0.0

# Traefik configuration
TRAEFIK_NETWORK=traefik
CERT_RESOLVER=letsencrypt

# Container configuration
CONTAINER_NAME=othello
```

### 4. GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

**Required Secrets:**
- `VPS_HOST`: Your server's IP address or hostname
- `VPS_USERNAME`: SSH username for your server
- `VPS_SSH_KEY`: Private SSH key for deployment (see SSH setup below)
- `VPS_PORT`: SSH port (default: 22)

**SSH Key Setup:**
```bash
# On your local machine, generate deployment keys
ssh-keygen -t rsa -b 4096 -f ~/.ssh/othello_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/othello_deploy.pub user@your-server.com

# Add private key content to GitHub Secrets as VPS_SSH_KEY
cat ~/.ssh/othello_deploy
```

## 🚀 Deployment Process

### Automatic Deployment

**Push to main branch:**
```bash
git push origin main
```

**Manual deployment:**
1. Go to GitHub Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Choose environment (production/staging)

### Manual Deployment on Server

**Production deployment:**
```bash
cd ~/othello
git pull origin main
./deploy.sh deploy
```

**Local testing:**
```bash
./deploy.sh local
```

## 🔍 Monitoring and Maintenance

### Health Checks

**Application health endpoint:**
```bash
curl http://localhost:3000/health
```

**Docker container status:**
```bash
docker ps --filter "name=othello"
```

### Viewing Logs

**Production logs:**
```bash
./deploy.sh logs
```

**Local logs:**
```bash
./deploy.sh logs-local
```

**Follow logs in real-time:**
```bash
docker logs -f othello
```

### Container Management

**Restart containers:**
```bash
# Production
./deploy.sh restart

# Local
./deploy.sh restart-local
```

**Stop containers:**
```bash
# Production
./deploy.sh stop

# Local
./deploy.sh stop-local
```

## 🔧 Troubleshooting

### Common Issues

**1. Container fails to start**
```bash
# Check logs
docker logs othello

# Check container status
docker ps -a

# Verify environment file
cat .env.production
```

**2. Health check fails**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Check port binding
netstat -tlnp | grep 3000
```

**3. SSL/TLS issues**
```bash
# Check Traefik logs
docker logs traefik

# Verify domain DNS
nslookup othello.yourdomain.com

# Check certificate generation
docker logs traefik | grep -i cert
```

**4. Build fails**
```bash
# Check build logs in GitHub Actions
# Verify node_modules and build process
npm ci
npm run build
```

### Debug Commands

**Container inspection:**
```bash
# Inspect container
docker inspect othello

# Execute commands in container
docker exec -it othello sh

# Check environment variables
docker exec othello env
```

**Network diagnosis:**
```bash
# Check docker networks
docker network ls

# Inspect traefik network
docker network inspect traefik

# Test connectivity
docker exec othello ping google.com
```

## 📈 Performance Optimization

### Container Resources

**Memory limits:**
```yaml
# In docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
```

**Health check tuning:**
```yaml
healthcheck:
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Build Optimization

**Docker build caching:**
```bash
# Use BuildKit for better caching
export DOCKER_BUILDKIT=1
docker build --cache-from othello:latest .
```

## 🔒 Security Considerations

### Container Security

**Non-root user:**
- Application runs as non-root user `othello`
- Limited file system access
- No elevated privileges

**Security headers:**
- Implemented via Traefik middleware
- Frame denial, XSS protection
- HSTS headers for HTTPS

### Network Security

**Internal communication:**
- Containers communicate via internal networks
- No unnecessary port exposure
- Traefik handles SSL termination

**SSH access:**
- Use dedicated SSH keys for deployment
- Regularly rotate SSH keys
- Monitor SSH access logs

## 📊 Monitoring and Alerting

### Application Metrics

**Health endpoint data:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "build": "abc1234",
  "branch": "main",
  "buildTime": "2024-01-01T00:00:00.000Z"
}
```

### Log Management

**Structured logging:**
- JSON format for production
- Centralized log collection
- Log rotation and retention

**Log analysis:**
```bash
# Error tracking
docker logs othello | grep ERROR

# Performance monitoring
docker logs othello | grep -i performance

# User activity tracking
docker logs othello | grep -i socket
```

## 🔄 Rollback Process

### Quick Rollback

**Using git:**
```bash
cd ~/othello
git log --oneline -10
git reset --hard <previous-commit>
./deploy.sh deploy
```

**Using Docker:**
```bash
# Use previous image
docker tag othello:latest othello:backup
docker pull othello:previous
./deploy.sh deploy
```

### Rollback Verification

**Check application:**
```bash
# Verify health
curl http://localhost:3000/health

# Check version
curl http://localhost:3000/health | jq .version

# Test functionality
curl http://localhost:3000/
```

## 📚 Additional Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Monitoring Tools
- [Watchtower](https://containrrr.dev/watchtower/) - Automated container updates
- [Portainer](https://www.portainer.io/) - Container management UI
- [Prometheus](https://prometheus.io/) - Metrics collection

### Security Tools
- [Docker Bench Security](https://github.com/docker/docker-bench-security)
- [Trivy](https://github.com/aquasecurity/trivy) - Container vulnerability scanner

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Deploy to production
./deploy.sh deploy

# Check logs
./deploy.sh logs

# Health check
curl http://localhost:3000/health

# Container status
docker ps --filter "name=othello"

# Restart application
./deploy.sh restart
```

### File Structure
```
~/othello/
├── .env.production          # Production environment
├── .env.local              # Local testing environment
├── deploy.sh               # Deployment script
├── docker-compose.prod.yml # Production compose file
├── docker-compose.local.yml # Local compose file
├── Dockerfile              # Container build instructions
└── .github/workflows/      # GitHub Actions workflows
```

This deployment setup provides a robust, production-ready environment for the Othello game with comprehensive monitoring, security, and maintenance capabilities.