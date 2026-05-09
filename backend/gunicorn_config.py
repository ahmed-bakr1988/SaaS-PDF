import multiprocessing
import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
# For 2 vCPU, we use (2 * cpu) + 1 = 5, but since we have heavy Celery workers, 
# we reduce it to 3 to leave room for Celery.
workers = int(os.getenv("GUNICORN_WORKERS", 3))
worker_class = "gthread"
threads = int(os.getenv("GUNICORN_THREADS", 4))
worker_connections = 1000

# Timeout
# Web requests should be fast; heavy lifting is in Celery.
timeout = int(os.getenv("GUNICORN_TIMEOUT", 60))
keepalive = 2

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process management
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Preload application for better memory usage and DB initialization
preload_app = True

# Safety: restart workers after X requests to prevent memory leaks
max_requests = 1000
max_requests_jitter = 50
