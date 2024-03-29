FROM python:3.9-slim
WORKDIR /code

# Copy just the requirements and install them. This caches the layer
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt

# Copy the rest of the application
COPY ./app /code/app

# Use environment variables for configuration
ENV HOST=0.0.0.0
ENV PORT=80

# Create a user and switch to it for security reasons
RUN groupadd -r app && useradd --no-log-init -r -g app app && chown -R app:app /code
USER app

EXPOSE $PORT

# Run app/main.py
CMD uvicorn app.main:app --host $HOST --port $PORT