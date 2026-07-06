# TradeBot Market Profile - Python Backend Dockerfile
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy project files into container
COPY . /app/

# Ensure proper read/execute permissions
RUN chmod -R 755 /app

# Expose port 8000
EXPOSE 8000

# Healthcheck to verify Python API responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Start Python HTTP & REST API server
CMD ["python", "server.py", "--port", "8000"]
