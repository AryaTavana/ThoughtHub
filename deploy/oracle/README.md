# Deploy ThoughtHub on Oracle Cloud Always Free

This deployment runs the React frontend, Django API/admin, PostgreSQL, uploaded
media, and automatic HTTPS on one Oracle Compute VM.

## Architecture

- **Caddy** is the only public container. It obtains and renews HTTPS
  certificates, serves uploaded media, and proxies the application.
- **Django + Gunicorn** serves the API, admin, and the compiled React app.
- **PostgreSQL** is reachable only inside the Docker network.
- Named Docker volumes persist PostgreSQL data, uploaded media, and Caddy's TLS
  state on the VM boot volume.

## 1. Create the Oracle VM

Create an Always Free Ampere A1 Flex instance with Ubuntu 24.04 LTS. One OCPU
and 6 GB RAM is enough for an initial deployment. Keep the boot volume in the
Always Free allowance and assign a public IPv4 address.

Oracle documents the current allowance and idle-instance policy in its
[Always Free resources guide](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

In the subnet security list or Network Security Group, add stateful ingress
rules for:

| Protocol | Port | Source | Purpose |
| --- | ---: | --- | --- |
| TCP | 22 | Your own public IP | SSH administration |
| TCP | 80 | `0.0.0.0/0` | HTTP and certificate validation |
| TCP | 443 | `0.0.0.0/0` | HTTPS |
| UDP | 443 | `0.0.0.0/0` | Optional HTTP/3 |

Do not expose PostgreSQL port 5432. If the Ubuntu host firewall is enabled,
allow the same web ports there as well.

## 2. Point a hostname at the VM

Create an `A` record for your hostname that points to the VM public IPv4
address. A provider subdomain such as DuckDNS also works. Wait until the name
resolves publicly before starting Caddy; ports 80 and 443 must be reachable for
automatic HTTPS.

## 3. Install Docker and get the source

Install Docker Engine and the Docker Compose plugin from Docker's official
Ubuntu repository. Add your SSH user to the `docker` group, then sign out and
back in so Docker can run without `sudo`.

Follow Docker's maintained
[Ubuntu installation instructions](https://docs.docker.com/engine/install/ubuntu/)
rather than using an unofficial package or installation script.

Clone the repository on the VM and enter its directory:

```bash
git clone https://github.com/AryaTavana/ThoughtHub.git
cd ThoughtHub
```

## 4. Configure production secrets

Create the untracked production environment file:

```bash
cp deploy/oracle/oracle.env.example deploy/oracle/oracle.env
chmod 600 deploy/oracle/oracle.env
```

Generate independent secrets:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Edit `deploy/oracle/oracle.env` and set:

- `DOMAIN` to the public hostname, without `https://`.
- `DJANGO_SECRET_KEY` to the first generated value.
- `POSTGRES_PASSWORD` to the second generated value.
- `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, and `FRONTEND_URL` to the
  same hostname, following the formats in the example.

Never commit `oracle.env`.

## 5. Build and start

Validate the Compose file, build the multi-architecture image, and start the
stack:

```bash
docker compose -f compose.oracle.yml config --quiet
docker compose -f compose.oracle.yml up -d --build
docker compose -f compose.oracle.yml ps
docker compose -f compose.oracle.yml logs -f web caddy
```

The web container applies database migrations and collects static files before
Gunicorn starts. Caddy requests the HTTPS certificate after the web health check
passes. Visit `https://YOUR_DOMAIN/healthz/`; it should return:

```json
{"status": "ok"}
```

Then open the site root and `/admin/`.

## 6. Create the first administrator

Run this interactively once:

```bash
docker compose -f compose.oracle.yml exec web python manage.py createsuperuser
```

## 7. Enable password-reset email

The example initially logs email inside the web container instead of delivering
it. To use an SMTP provider, update these values in `oracle.env`:

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DEFAULT_FROM_EMAIL=ThoughtHub <no-reply@your-domain.example>
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=True
```

Restart only the application after changing email configuration:

```bash
docker compose -f compose.oracle.yml up -d --force-recreate web
```

## Existing database and media

For an existing PostgreSQL database, make a custom or plain SQL dump locally,
copy it to the server, and restore it before accepting new writes. A plain dump
can be restored with:

```bash
gzip -dc database.sql.gz | docker compose -f compose.oracle.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

To import an existing media archive:

```bash
gzip -dc media.tar.gz | docker compose -f compose.oracle.yml exec -T web tar -C /app/media -xf -
```

Restart the web service after a database restore.

## Backups

Create a timestamped PostgreSQL and media backup:

```bash
./deploy/oracle/backup.sh
```

Backups under `backups/` are ignored by Git. Copy them regularly to a second
machine or object-storage account; a backup stored only on the VM is lost if the
boot volume is lost. Test restoration periodically.

## Deploy updates

Back up first, pull the new source, rebuild, and remove obsolete images:

```bash
./deploy/oracle/backup.sh
git pull --ff-only
docker compose -f compose.oracle.yml up -d --build
docker image prune -f
```

Do not use `docker compose down -v`; the `-v` flag deletes the database, media,
and certificate volumes.

## Useful operations

```bash
# Status
docker compose -f compose.oracle.yml ps

# Recent logs
docker compose -f compose.oracle.yml logs --tail=200 web caddy db

# Django deployment checks
docker compose -f compose.oracle.yml exec web python manage.py check --deploy

# Restart without deleting data
docker compose -f compose.oracle.yml restart
```

The initial environment intentionally leaves HSTS subdomain coverage and
browser preloading disabled, so `check --deploy` reports `W005` and `W021`.
Enable those settings only after every subdomain is permanently HTTPS-ready.
