---
trigger: always_on
glob:
description:
---

```md
# SaaS-PDF — Project Core Knowledge & Engineering Rules

## Project Identity

Project Name:
SaaS-PDF

Project Type:
Production-oriented SaaS platform for PDF and file processing.

Architecture Style:
Service-oriented monolithic architecture with asynchronous task processing.

Primary Stack:
- Flask
- Python 3.12
- Celery
- Redis
- PostgreSQL
- Docker
- Nginx
- Gunicorn

Frontend:
- React
- Vite

Infrastructure:
- Docker Compose
- Ubuntu Linux
- Hetzner VPS

---

# Core Business Purpose

The platform provides heavy file-processing services including:

- PDF conversion
- OCR
- Image processing
- Background removal
- Office document conversion
- Video processing
- Compression tools
- AI-assisted processing
- HTML-to-PDF rendering

This is NOT a standard CRUD web application.

The system is:
- CPU-intensive
- Memory-intensive
- Queue-driven
- File-processing heavy

The architecture must prioritize:
- stability
- task isolation
- resource efficiency
- fault tolerance

over visual complexity.

---

# Current Infrastructure Constraints

Server:
- Hetzner CPX22
- 2 vCPU
- 4GB RAM
- 80GB SSD

Important:
Infrastructure resources are LIMITED.

The application must be optimized for:
- low CPU usage
- low RAM usage
- controlled concurrency
- efficient queue management

Avoid resource-heavy architectural decisions.

---

# Critical Engineering Reality

This platform is vulnerable to:
- CPU saturation
- memory exhaustion
- queue congestion
- worker starvation
- timeout cascades
- blocking operations
- large file abuse
- traffic spikes

Heavy operations include:
- LibreOffice
- OCR
- FFmpeg
- Playwright
- WeasyPrint
- ONNX
- rembg

All architecture decisions must account for this reality.

---

# Mandatory Engineering Principles

## 1. Never Block HTTP Requests

Heavy processing must NEVER run inside Flask request handlers.

Always use:
- Celery tasks
- asynchronous processing
- background workers

The web layer must remain lightweight.

---

## 2. Queue Isolation Is Mandatory

Different workloads MUST be isolated.

Required queues:
- default
- light_tasks
- pdf_processing
- image_processing
- ocr_tasks
- video_processing
- ai_heavy

Heavy tasks must never block lightweight tasks.

---

## 3. CPU Protection Is Critical

Avoid:
- excessive multiprocessing
- too many Gunicorn workers
- unbounded Celery concurrency
- parallel heavy tasks

This VPS has only 2 vCPU.

CPU thrashing must be avoided.

---

## 4. RAM Efficiency Is Mandatory

Avoid:
- loading large files fully into memory
- duplicate file buffers
- unnecessary caching
- memory leaks
- large temporary objects

Prefer:
- streaming
- chunk processing
- temporary file cleanup

---

## 5. Every Heavy Task Must Have Timeouts

Mandatory:
- soft time limits
- hard time limits
- subprocess timeout handling

Never allow:
- hanging LibreOffice processes
- infinite FFmpeg jobs
- stuck OCR tasks

---

## 6. File Upload Security Is Mandatory

All uploads must include:
- MIME validation
- extension validation
- file size limits
- malware-safe handling
- path sanitization

Protect against:
- malformed PDFs
- zip bombs
- oversized uploads
- malicious payloads

---

## 7. Temporary File Cleanup Is Required

The system generates many temporary files.

Always implement:
- automatic cleanup
- expiration handling
- orphaned file removal

Storage leaks are unacceptable.

---

## 8. Production Stability > Fancy Code

Prioritize:
- predictable behavior
- resilience
- observability
- operational simplicity

Avoid:
- overengineering
- unnecessary abstractions
- experimental architectures

---

## 9. Observability Is Mandatory

The platform must expose:
- CPU metrics
- RAM metrics
- queue latency
- failed tasks
- task duration
- Redis health
- PostgreSQL health

Recommended tools:
- Flower
- Prometheus
- Grafana
- Netdata
- Sentry

---

## 10. Docker Is Production Infrastructure

Docker containers must:
- include health checks
- use restart policies
- minimize image size
- isolate services properly

Never treat Docker as development-only tooling.

---

# Backend Architecture Rules

## Flask Layer
Flask should handle:
- authentication
- validation
- routing
- lightweight orchestration

Flask should NOT:
- process large files directly
- run OCR directly
- run FFmpeg directly
- perform blocking conversions

---

## Celery Rules

Celery is the core execution engine.

Requirements:
- isolated queues
- retry strategies
- task timeouts
- failure handling
- idempotent tasks
- task monitoring

Tasks must:
- tolerate crashes
- support retries safely
- avoid duplicate processing

---

## Redis Rules

Redis is used for:
- Celery broker
- caching
- rate limiting

Redis must:
- remain lightweight
- avoid large payload storage
- avoid memory overflow

Do not store massive binary data in Redis.

---

## PostgreSQL Rules

Database priorities:
- reliability
- indexing
- query efficiency
- connection safety

Avoid:
- N+1 queries
- long transactions
- unnecessary locks

---

# Performance Rules

## Before Any Optimization:
Measure first.

Never optimize blindly.

Always monitor:
- CPU
- RAM
- queue latency
- task duration
- disk I/O

---

## Image Processing Rules

Before OCR or AI:
- resize images
- compress images
- reduce dimensions

This significantly reduces:
- CPU usage
- RAM usage
- processing time

---

## PDF Processing Rules

Use:
- streaming where possible
- temporary file workflows
- isolated processing workers

Avoid:
- loading entire large PDFs into memory

---

# Security Rules

Mandatory:
- rate limiting
- brute-force protection
- secure headers
- request throttling
- upload validation

Critical endpoints:
- uploads
- conversion APIs
- authentication routes

must be hardened.

---

# Scaling Philosophy

Current architecture is:
"Early Production SaaS"

NOT:
"Large-scale distributed platform"

Scaling strategy should be:
1. Stabilize
2. Observe
3. Optimize
4. Then scale

Do NOT prematurely introduce:
- Kubernetes
- microservices
- distributed orchestration

until genuinely needed.

---

# Deployment Philosophy

Deployment priorities:
1. Stability
2. Recoverability
3. Monitoring
4. Simplicity

The system must:
- restart safely
- recover automatically
- survive partial failures

---

# AI Assistant Instructions

When modifying this project:

ALWAYS:
- preserve architecture consistency
- preserve queue isolation
- preserve production safety
- optimize for low-resource VPS environments
- avoid blocking operations
- improve observability
- improve fault tolerance

NEVER:
- add synchronous heavy processing
- increase concurrency blindly
- introduce memory-heavy patterns
- remove timeout protections
- bypass validation
- create CPU-intensive loops without safeguards

All modifications must be:
- production-aware
- resource-aware
- scalable
- fault-tolerant
- maintainable

---

# Final Engineering Goal

Transform SaaS-PDF into:

"A stable, scalable, production-grade PDF processing platform capable of surviving real-world traffic spikes and heavy asynchronous workloads while running efficiently on constrained infrastructure."
```
