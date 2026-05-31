# =============================================================================
# Gunicorn Production Configuration
# =============================================================================

import multiprocessing

# Server Socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker Processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"          # Better for I/O bound Flask apps
threads = 4
worker_connections = 1000

# Timeout & Graceful Shutdown
timeout = 120
keepalive = 65
graceful_timeout = 60

# Logging
accesslog = "-"                   # stdout
errorlog = "-"                    # stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process Naming
proc_name = "r1-flask-proxy"

# Server Mechanics
preload_app = True                # Load app before forking workers
max_requests = 1000               # Restart worker after X requests (prevents memory leaks)
max_requests_jitter = 100
