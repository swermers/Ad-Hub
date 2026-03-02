FROM python:3.12-slim

WORKDIR /app

# Install system deps for Playwright chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libdbus-1-3 libdrm2 libxkbcommon0 libxcomposite1 \
        libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
        libcairo2 libasound2 libatspi2.0-0 libwayland-client0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright chromium browser
RUN playwright install chromium

COPY . .

# Create data directories
RUN mkdir -p /app/data /app/chroma_data

# Use /app/data for persistent storage
ENV DATABASE_URL=sqlite:////app/data/adhub.db
ENV CHROMADB_PATH=/app/data/chroma_data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
