# Deploy ThoughtHub on Alwaysdata Free

Alwaysdata runs this project natively as a Python WSGI application and provides
the PostgreSQL server, TLS proxy, and backups. Docker is not used: Alwaysdata
only makes Docker available on Private Cloud, not on its free Public Cloud plan.

## Free-plan limits

As of August 2026, the free plan provides 1 GB total disk space, 256 MB RAM,
one quarter of a CPU, and three rolling days of backups. The disk allowance
includes application files, databases, and email. It is limited to personal,
non-profit use and the provided `ACCOUNT.alwaysdata.net` website address; a
custom website domain requires a paid plan.

## 1. Create the Alwaysdata resources

Create a free account at <https://www.alwaysdata.com/en/register/> and note the
account name. In the administration interface:

1. Open **Databases > PostgreSQL**, create a database and a database user, and
   give that user full access to the database. Alwaysdata normally prefixes
   their names with the account name; copy the exact resulting values.
2. Open **Remote access > SSH/SFTP**, enable the account's SSH user, and add an
   SSH key or temporarily allow password authentication.

The PostgreSQL hostname is normally
`postgresql-ACCOUNT.alwaysdata.net`. Confirm it in the database screen.

## 2. Create the private production environment

From the project root on the development computer:

```bash
cp deploy/alwaysdata/alwaysdata.env.example \
  deploy/alwaysdata/alwaysdata.env
chmod 600 deploy/alwaysdata/alwaysdata.env
python -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Edit `alwaysdata.env`, replace every `ACCOUNT` placeholder, paste the generated
value as `DJANGO_SECRET_KEY`, and enter the exact PostgreSQL credentials from
the dashboard. This private file is ignored by Git.

## 3. Upload and initialize the application

Run the deployment helper locally:

```bash
ALWAYSDATA_ACCOUNT=ACCOUNT ./deploy/alwaysdata/deploy.sh
```

It builds React locally to avoid storing Node dependencies on the free account,
uploads the source and compiled frontend over SSH, creates a Python 3.14 virtual
environment, installs runtime-only dependencies, migrates PostgreSQL, collects
static files, and runs Django's deployment checks. Existing uploaded media is
not overwritten.

Before accepting an unfamiliar SSH host key, compare its fingerprint with the
one shown in **Remote access > SSH/SFTP**.

## 4. Configure the WSGI website

Open **Web > Sites > Add a site** and use:

| Field | Value |
| --- | --- |
| Addresses | `ACCOUNT.alwaysdata.net` |
| Type | Python WSGI |
| Application path | `/home/ACCOUNT/www/thoughthub/ThoughtHub/wsgi.py` |
| Working directory | `/home/ACCOUNT/www/thoughthub` |
| Python version | `3.14` |
| Virtualenv directory | `/home/ACCOUNT/www/thoughthub/.venv` |

Enable the site's HTTP-to-HTTPS redirect and save it. Alwaysdata's front proxy
sets `X-Forwarded-Proto`, which the Django settings already trust. Restart the
site after the first deployment, then check:

```text
https://ACCOUNT.alwaysdata.net/healthz/
```

It should return `{"status":"ok"}`. Also test the home page and `/admin/`.

## 5. Create the first administrator

Run this once over SSH:

```bash
ssh ACCOUNT@ssh-ACCOUNT.alwaysdata.net \
  'cd www/thoughthub && .venv/bin/python manage.py createsuperuser'
```

## Updates and operations

Deploy a later version by rerunning:

```bash
ALWAYSDATA_ACCOUNT=ACCOUNT ./deploy/alwaysdata/deploy.sh
```

The deployment helper never deletes `media/`. Alwaysdata backs up files and
PostgreSQL daily for three rolling days on the free plan; keep occasional
off-platform copies as well. Application errors appear in
`/home/ACCOUNT/admin/logs/uwsgi/`, and site start failures appear in
`/home/ACCOUNT/admin/logs/sites/`.

The free plan serves uploads through Django when `DJANGO_SERVE_MEDIA=True`.
That is reasonable for a small personal site. If traffic or media volume grows,
move uploads to dedicated storage or upgrade to a plan that supports a separate
static/media site and custom domain.
