# ---- Frontend build ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Production image ----
FROM python:3.12-slim
WORKDIR /app

COPY pyproject.toml README.md ./
COPY src/ src/
COPY --from=frontend /app/src/rocket_cea_gui/static src/rocket_cea_gui/static

RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "rocket_cea_gui.server:app", "--host", "0.0.0.0", "--port", "8000"]