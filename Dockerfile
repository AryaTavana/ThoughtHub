# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY design/ /build/design/
RUN npm run build


FROM python:3.14-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN addgroup --system app \
    && adduser --system --ingroup app --home /app app

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .
COPY --from=frontend-builder --chown=app:app \
    /build/frontend/dist /app/frontend/dist

RUN mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app/media /app/staticfiles \
    && chmod +x /app/deploy/oracle/entrypoint.sh

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD ["python", "-c", "import urllib.request; request = urllib.request.Request('http://127.0.0.1:8000/healthz/', headers={'X-Forwarded-Proto': 'https'}); urllib.request.urlopen(request, timeout=3)"]

ENTRYPOINT ["/app/deploy/oracle/entrypoint.sh"]
