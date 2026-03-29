# Read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
# you will also find guides on how best to write your Dockerfile

FROM python:3.10-slim

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=7860
ENV DEBIAN_FRONTEND=noninteractive

# Update and install system dependencies (for building some scientific packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .

# Upgrade pip and install packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create a non-root user (Hugging Face Spaces requirement)
RUN useradd -m -u 1000 user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Change working directory to user home
WORKDIR $HOME/app

# Copy the current directory contents into the container at $HOME/app setting the owner
COPY --chown=user . $HOME/app

# Run the FastAPI server on port 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
