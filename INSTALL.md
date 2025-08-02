# Installation Guide

There are two primary methods for installing the OpenRouter API Watcher: using a **systemd service** on a dedicated Linux host, or using **containers** with `docker-compose`.

---

## Method 1: Systemd User Service

This method is suitable for a dedicated Linux server. The provided service file uses **hardcoded paths** and assumes the application will be run by a user named `orw` from its home directory.

1.  **Create a dedicated user**

    As `superuser`, create a new user (e.g., `orw`):
    ```shell
    adduser orw
    ```

2.  **Enable user lingering**

    Enable lingering for the `orw` user, so the service continues to run after the user logs out:
    ```shell
    loginctl enable-linger orw
    ```

3.  **Clone the repository**

    As the `orw` user, clone the repository into the home directory:
    ```shell
    su - orw
    git clone https://github.com/fry69/orw
    cd orw
    ```

4.  **Configure the environment**

    Navigate to the application directory and create an environment file.
    ```shell
    cd orw-deno
    cp .env.example .env
    ```
    You can edit `.env` to change the port, hostname, and other settings.

5.  **Build the application**

    The systemd service serves pre-built application files. You must build them first:
    ```shell
    deno task build
    ```

6.  **(Optional) Provide a seed database**

    The public seed database is no longer available. If you have a local database file (e.g., `orw.db`), place it in the `orw-deno/data/` directory.

7.  **Install the systemd service**

    From the root of the repository, run the installation script:
    ```shell
    cd ~/orw
    sh ./service/install_service.sh
    ```

8.  **Start and check the service**

    After successful installation, you can start and manage the service:
    ```shell
    # Start the service
    systemctl --user start orw-deno

    # Check its status
    systemctl --user status orw-deno

    # View logs
    journalctl --user -u orw-deno -f
    ```

9.  **Updating the application**

    To update the application later:
    ```shell
    cd ~/orw
    git pull --rebase
    cd orw-deno
    deno task build
    systemctl --user restart orw-deno
    ```

---

## Method 2: Container-based Installation (Recommended)

This method uses `docker-compose` to build and run the application in a container. It is the recommended approach for most users.

1.  **Clone the repository**
    ```shell
    git clone https://github.com/fry69/orw
    cd orw
    ```

2.  **Configure the environment**

    Create a `.env` file in the root of the repository to configure the container setup.
    ```shell
    cp .env.example .env
    ```
    You will need to edit this file. Here is an explanation of the variables:
    - `PROJECT_DIR=orw-deno`: The directory containing the Deno application.
    - `IMAGE_NAME=orw-deno`: The name for the built Docker image.
    - `VOLUME_NAME=orw-data`: The name of the Docker volume used to persist the database. It is recommended to use a static name.
    - `EXTERNAL_PORT=8000`: The host port that will map to the container's port 8000.
    - `ORW_PUBLIC_URL`: The public URL where the application will be accessible (e.g., `http://localhost:8000` or `https://orw.example.com`).
    - `ORW_REPOSITORY_URL`: An optional URL to your repository for display in the UI.

3.  **(Optional) Provide a seed database**

    The public seed database is no longer available. To seed the database from a local file:
    a. Place your gzipped database file (e.g., `orw.db.gz`) in a `data/` directory in the root of the repository.
    b. Set `SEED_DB_FILE=orw.db.gz` in your `.env` file.
    c. Run the seed service once using a specific profile:
    ```shell
    docker-compose --profile seed up
    ```
    This will copy the database into the named volume.

4.  **Build and run the application**
    ```shell
    docker-compose up --build -d
    ```
    The application will be built and started in the background. You can view logs with `docker-compose logs -f`.

---

## TLS/HTTPS Frontend

Regardless of the installation method, it is strongly recommended to use a reverse proxy like [Caddy](https://caddyserver.com/) or Nginx to provide a TLS/HTTPS frontend, especially for a public-facing instance. Some RSS feed readers also require HTTPS. Setting up a reverse proxy is straightforward and will handle TLS certificate acquisition and renewal automatically.
