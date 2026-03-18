"""WSGI entry point for Gunicorn."""
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

app = create_app()

# Trust the X-Forwarded-* headers set by nginx so Flask sees the real
# scheme (https), host, and client IP.  This is essential for:
#  - SESSION_COOKIE_SECURE to work behind the reverse proxy
#  - CSRF cookie secure flag
#  - Talisman force_https detection
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
