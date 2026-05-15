# مقارنة docker-compose.yml - التحسينات المقترحة

## ❌ المشاكل المحتملة

### مشكلة 1: Redis لا يفرض كلمة المرور (السطر 15)
```yaml
# ❌ الحالي
command: ["redis-server", "/usr/local/etc/redis/redis.conf"]

# ✅ الصحيح - يجب تمرير requirepass
command: 
  - redis-server
  - /usr/local/etc/redis/redis.conf
  - --requirepass
  - ${REDIS_PASSWORD:-dev-only-password}
```

### مشكلة 2: Redis Health Check لا يستخدم كلمة المرور (السطر 17)
```yaml
# ❌ الحالي
test: ["CMD", "redis-cli", "ping"]

# ✅ الصحيح
test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
```

### مشكلة 3: Redis لا تحصل على متغيرات البيئة (السطر 3-15)
```yaml
# ❌ الحالي - بدون environment section

# ✅ الصحيح
redis:
  image: redis:7-alpine
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  # ... الباقي
```

### مشكلة 4: Flower لا يستقبل متغير REDIS_PASSWORD
```yaml
# ❌ الحالي (السطر 220)
- CELERY_BROKER_URL=${CELERY_BROKER_URL:-redis://redis:6379/0}

# ✅ الصحيح - يجب استخدام المتغير المعرّف
- CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
```

---

## 📝 الملف المحسّن الكامل

```yaml
services:
  # --- Redis (FIXED) ---
  redis:
    image: redis:7-alpine
    ports:
      # Bind Redis port to localhost to avoid exposing it to the public network.
      # For production, prefer removing host port mapping entirely and keeping
      # the service on the internal Docker network (or use compose prod file).
      - "127.0.0.1:6379:6379"
    environment:
      # Pass password as environment variable for reference
      - REDIS_PASSWORD=${REDIS_PASSWORD:-dev-only-password}
    volumes:
      - redis_data:/data
      # Mount local secure Redis config (read-only). Replace or manage the
      # requirepass via secrets in production; do NOT commit real passwords.
      - ./deploy/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    # FIXED: يمرر كلمة المرور من الآن
    command: 
      - redis-server
      - /usr/local/etc/redis/redis.conf
      - --requirepass
      - "${REDIS_PASSWORD:-dev-only-password}"
    # FIXED: Health check يستخدم كلمة المرور
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-dev-only-password}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # --- PostgreSQL ---
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=dociva
      - POSTGRES_USER=dociva
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dev-only-password-12345}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dociva -d dociva"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # --- Flask Backend ---
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    env_file:
      - .env
    environment:
      - FLASK_ENV=development
      - DATABASE_URL=postgresql://dociva:${POSTGRES_PASSWORD:-6x3PjV4ghRTQuZ3Q}@postgres:5432/dociva
      # FIXED: استخدام المتغير الصحيح
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
      - REDIS_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
    volumes:
      - ./backend:/app
      - upload_data:/tmp/uploads
      - output_data:/tmp/outputs
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    restart: unless-stopped

  # --- Celery Workers (Isolated Queues) ---
  
  # 1. Light Tasks Worker (High Concurrency, Low CPU)
  celery_worker_light:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: >
      celery -A celery_worker.celery worker
      --loglevel=info
      --concurrency=2
      -Q light_tasks
      -n worker_light@%h
    env_file: [.env]
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://dociva:${POSTGRES_PASSWORD:-6x3PjV4ghRTQuZ3Q}@postgres:5432/dociva
      # FIXED: متغيرات Celery الصحيحة
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
    volumes:
      - ./backend:/app
      - upload_data:/tmp/uploads
      - output_data:/tmp/outputs
    depends_on:
      redis: { condition: service_healthy }
      postgres: { condition: service_healthy }
    restart: unless-stopped

  # 2. PDF Processing Worker (Medium Concurrency)
  celery_worker_pdf:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: >
      celery -A celery_worker.celery worker
      --loglevel=info
      --concurrency=1
      -Q pdf_processing
      -n worker_pdf@%h
    env_file: [.env]
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://dociva:${POSTGRES_PASSWORD:-6x3PjV4ghRTQuZ3Q}@postgres:5432/dociva
      # FIXED
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
    volumes:
      - ./backend:/app
      - upload_data:/tmp/uploads
      - output_data:/tmp/outputs
    depends_on:
      redis: { condition: service_healthy }
      postgres: { condition: service_healthy }
    restart: unless-stopped

  # 3-6. Workers الأخرى (نفس النمط...)
  # تطبيق نفس التصحيحات على:
  # - celery_worker_image
  # - celery_worker_heavy
  # - celery_worker_video
  # - celery_worker_default

  # --- Celery Monitoring (Flower) ---
  flower:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A celery_worker.celery flower --port=5555
    ports:
      - "5555:5555"
    env_file: [.env]
    environment:
      # FIXED: استخدام المتغيرات الصحيحة مع كلمات المرور
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
    depends_on:
      redis: { condition: service_healthy }
    restart: unless-stopped

  # --- Celery Beat (Scheduled Tasks) ---
  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: >
      celery -A celery_worker.celery beat
      --loglevel=info
    env_file:
      - .env
    environment:
      - FLASK_ENV=development
      - DATABASE_URL=postgresql://dociva:${POSTGRES_PASSWORD:-6x3PjV4ghRTQuZ3Q}@postgres:5432/dociva
      # FIXED
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
    volumes:
      - ./backend:/app
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "true"]
      interval: 30s
      timeout: 5s
      retries: 1
    restart: unless-stopped

  # --- React Frontend (Vite Dev) ---
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID:-}
      - VITE_PLAUSIBLE_DOMAIN=${VITE_PLAUSIBLE_DOMAIN:-}
      - VITE_PLAUSIBLE_SRC=${VITE_PLAUSIBLE_SRC:-https://plausible.io/js/script.js}
      # ... باقي المتغيرات ...

  # --- Nginx Reverse Proxy ---
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/conf.d/default.conf:ro
      - ${HOST_LETSENCRYPT_CONF:-./certbot/conf}:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  # --- Certbot (Let's Encrypt) ---
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/www:/var/www/certbot
      - ./certbot/conf:/etc/letsencrypt

  # --- Gitea (self-hosted Git) ---
  gitea:
    image: gitea/gitea:latest
    restart: unless-stopped
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__server__SSH_PORT=2222
      - GITEA__server__DOMAIN=${GITEA_DOMAIN:-}
      - GITEA__server__ROOT_URL=${GITEA_ROOT_URL:-}
    volumes:
      - gitea_data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    expose:
      - "3000"
    ports:
      - "2222:22"

volumes:
  redis_data:
  postgres_data:
  upload_data:
  output_data:
  db_data:
  gitea_data:
```

---

## 🔑 ملخص الإصلاحات

| السطر | المشكلة | الإصلاح |
|------|--------|--------|
| 15 | Redis لا يفرض password | أضف `--requirepass ${REDIS_PASSWORD}` إلى command |
| 17 | Health check بدون password | أضف `-a ${REDIS_PASSWORD}` إلى test |
| 3-15 | Redis بدون env vars | أضف `environment` section |
| Backend | متغيرات Celery ناقصة | أضف `CELERY_BROKER_URL` و `CELERY_RESULT_BACKEND` و `REDIS_URL` |
| Flower | متغيرات Celery ناقصة | أضف `CELERY_BROKER_URL` و `CELERY_RESULT_BACKEND` |
| All Workers | متغيرات Celery ناقصة | أضف نفس المتغيرات لجميع workers |

