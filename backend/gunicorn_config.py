"""Gunicorn production configuration for Dociva backend.

Server: Hetzner CPX22 — 2 vCPU, 4 GB RAM
Heavy processing is delegated to Celery workers, so Flask handlers
must remain lightweight (routing, validation, task enqueue only).

Tuning rationale
───────────────
workers = 2   →  1 per vCPU (Celery workers share the same 2 CPUs;
                 we cannot over-allocate).
threads = 2   →  gthread allows concurrent I/O-bound requests within
                 one worker (DB queries, Redis pings, token checks)
                 without spawning extra OS processes.
Effective concurrency = 2 × 2 = 4 simultaneous requests.
This is intentionally conservative to leave headroom for Celery.

Set GUNICORN_WORKERS / GUNICORN_THREADS in .env to override.
"""

import os

# ── Socket ────────────────────────────────────────────────────────────────
bind    = "0.0.0.0:5000"
backlog = 1024   # OS connection queue; 1024 is safe for 2 vCPU

# ── Workers ───────────────────────────────────────────────────────────────
# Use gthread so workers can handle concurrent I/O without spawning more
# processes (cheaper on the constrained VPS).
worker_class = "gthread"
workers      = int(os.getenv("GUNICORN_WORKERS", "2"))   # 1 per vCPU
threads      = int(os.getenv("GUNICORN_THREADS", "2"))   # 2 concurrent I/O per worker
worker_connections = 100   # max connections per worker (async workers only)

# ── Timeouts ──────────────────────────────────────────────────────────────
# Flask handlers should be lightning-fast (enqueue + return 202).
# Set a tight timeout to kill any accidental blocking call early.
timeout   = int(os.getenv("GUNICORN_TIMEOUT", "45"))   # seconds
keepalive = 2   # seconds to keep idle connections open (behind Nginx)
graceful_timeout = 30   # seconds to finish in-flight requests on SIGTERM

# ── Memory leak protection ────────────────────────────────────────────────
# Workers restart after N requests (+jitter) to reclaim any leaked memory.
max_requests        = int(os.getenv("GUNICORN_MAX_REQUESTS", "500"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "50"))

# ── Preload ───────────────────────────────────────────────────────────────
# Load the Flask app once in the master process, then fork workers.
# Saves ~30 MB RAM per worker via copy-on-write.
preload_app = True

# ── Logging ───────────────────────────────────────────────────────────────
accesslog = "-"       # stdout → Docker logs
errorlog  = "-"       # stderr → Docker logs
loglevel  = os.getenv("GUNICORN_LOG_LEVEL", "warning")   # info in dev, warning in prod

# Access log format with request duration and upstream ID
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s '
    '"%(f)s" "%(a)s" %(D)sµs'
)

# ── Process management ────────────────────────────────────────────────────
daemon  = False
pidfile = None
umask   = 0
user    = None
group   = None
tmp_upload_dir = None

# ── Worker lifecycle hooks ────────────────────────────────────────────────
def worker_exit(server, worker):
    """Log worker exit for observability."""
    server.log.info("Worker %s exiting (pid: %s)", worker.pid, worker.pid)


def on_starting(server):
    """Log startup so Docker healthcheck can detect readiness."""
    server.log.info(
        "Gunicorn starting — workers=%s threads=%s timeout=%ss",
        workers, threads, timeout,
    )
