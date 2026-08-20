<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/logos/thoughthub-horizontal-dark.svg">
    <img src="design/logos/thoughthub-horizontal-light.svg" alt="ThoughtHub" width="430">
  </picture>

  <p><strong>A full-stack publishing community for discovering, writing, and discussing ideas.</strong></p>

  <p>
    <img alt="Python 3.12+" src="https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white">
    <img alt="Django 6.0.8" src="https://img.shields.io/badge/Django-6.0.8-092E20?logo=django&logoColor=white">
    <img alt="React 19.2.8" src="https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=101010">
    <img alt="TypeScript 6.0.3" src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white">
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white">
  </p>
</div>

ThoughtHub combines a Django REST API with a React single-page application. Readers can explore and discuss published work, while registered authors get a private dashboard and a flexible, block-based editor. Staff moderation runs through a branded Django Admin workspace, with feedback and activity delivered back to users through in-app notifications.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Common commands](#common-commands)
- [API overview](#api-overview)
- [Publishing and moderation](#publishing-and-moderation)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Production notes](#production-notes)
- [Contributing](#contributing)
- [License](#license)

## Features

### Reading and discovery

- Paginated public feed with newest and most-viewed ordering
- Keyword discovery across titles, excerpts, content, authors, categories, tags, and text blocks
- Category, tag, author, and post-type filtering
- Public author profiles with publishing statistics
- Estimated reading time and view counts
- Responsive light and dark themes
- Automatic LTR/RTL direction for multilingual authored content, including Persian, Arabic, and Hebrew scripts

### Authoring

- Account registration, session-based login, logout, profile settings, and password recovery
- Private author dashboard for drafts, published posts, removed posts, and comment activity
- Article, news, tutorial, and opinion post types
- Featured images with required alternative text
- SEO title and description fields
- Ordered rich-text, image, video, quote, and divider content blocks
- Draft saving, immediate publishing, editing, republishing, and deletion

### Community and moderation

- Authenticated comments with per-post comment controls
- Personal saved-post reading lists
- Notifications for new comments and moderation actions
- Read/unread notification state and unread counts
- Branded Django Admin workspace for post and comment moderation
- Required moderator feedback when content is removed
- Revision flow that returns removed content to a draft before republishing

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.2, TypeScript 6.0.3, Bootstrap 5.3.8 |
| Frontend utilities | DOMPurify 3.4.12, Iconify React 6.0.2, Roboto 5.3.0 |
| Build tooling | Vite 8.1.5, React plugin 6.0.4, ESLint 10.8.0, Vitest 4.1.10 |
| UI testing | Testing Library React 16.3.2, jest-dom 7.0.0, user-event 14.6.1, jsdom 30.0.1 |
| Backend | Python 3.12+, Django 6.1, Django REST Framework 3.18.0 |
| Authentication | Django sessions with CSRF protection |
| Database | PostgreSQL via Psycopg 3.3.4 |
| Media | Pillow 12.3.0 and Django file uploads |
| Admin | Django Unfold 1.0.0 |
| Environment | python-dotenv 1.2.3 |
| Email | Django email backends; console output by default in development |

## Architecture

```text
Browser
  │
  ├── React application (Vite, :5173)
  │     └── /api, /media, /admin and /static are proxied in development
  │
  └── Django application (:8000)
        ├── Account API ── sessions, profiles, password recovery
        ├── Blog API ───── posts, blocks, comments, saved posts, notifications
        ├── Django Admin ─ publishing catalogue and moderation
        └── PostgreSQL ─── application data
```

The frontend sends same-origin requests to relative paths and includes credentials. Vite proxies those paths to Django during development. Unsafe requests include Django's CSRF token; authentication remains cookie- and session-based rather than token-based.

## Getting started

### Prerequisites

- Python 3.12 or newer
- Node.js `^20.19.0` or `>=22.12.0`
- npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone git@github.com:AryaTavana/ThoughtHub.git
cd ThoughtHub
```

HTTPS also works:

```bash
git clone https://github.com/AryaTavana/ThoughtHub.git
cd ThoughtHub
```

### 2. Install the backend

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

On Windows PowerShell, activate it with:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Configure PostgreSQL

Create a development role and database. The following values match the example configuration; choose different credentials if needed.

```sql
CREATE ROLE thoughthub WITH LOGIN PASSWORD 'development-only-password';
CREATE DATABASE thoughthub OWNER thoughthub;
```

You can run those statements from `psql` while connected as a PostgreSQL administrator. Then create the local environment file:

```bash
cp .env.example .env
```

Update at least this value in `.env`:

```dotenv
POSTGRES_PASSWORD=development-only-password
```

Keep `.env` private. It is ignored by Git.

### 4. Initialize Django

```bash
python manage.py migrate
python manage.py createsuperuser
```

The superuser can open the staff moderation and catalogue workspace at [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/). Add categories and tags there if you want them to appear as choices in the author editor.

### 5. Install the frontend

```bash
cd frontend
npm ci
```

### 6. Run the application

Start Django from the repository root:

```bash
source .venv/bin/activate
python manage.py runserver
```

In a second terminal, start Vite:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep both development servers running.

> [!TIP]
> With the default console email backend, password-reset messages and their one-use links are printed in the Django terminal instead of being delivered by email.

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and customize it for your environment.

| Variable | Development default/example | Purpose |
| --- | --- | --- |
| `DJANGO_DEBUG` | `True` | Enables Django debug mode and development media serving. |
| `DJANGO_SECRET_KEY` | Placeholder | Cryptographic signing secret. Use a long random value outside local development. |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hosts Django may serve. |
| `CSRF_TRUSTED_ORIGINS` | Local Vite origins | Comma-separated origins trusted for unsafe requests. |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend base URL used to build password-reset links. |
| `POSTGRES_DB` | `thoughthub` | PostgreSQL database name. |
| `POSTGRES_USER` | `thoughthub` | PostgreSQL role. |
| `POSTGRES_PASSWORD` | Placeholder | PostgreSQL password. |
| `POSTGRES_HOST` | `127.0.0.1` | PostgreSQL server host. |
| `POSTGRES_PORT` | `5432` | PostgreSQL server port. |
| `EMAIL_BACKEND` | Console backend | Django email delivery backend. |
| `DEFAULT_FROM_EMAIL` | `ThoughtHub <no-reply@localhost>` | Sender used for account email. |
| `EMAIL_HOST` | `localhost` | SMTP host when an SMTP backend is selected. |
| `EMAIL_PORT` | `25` | SMTP port. |
| `EMAIL_HOST_USER` | Empty | SMTP username. |
| `EMAIL_HOST_PASSWORD` | Empty | SMTP password. |
| `EMAIL_USE_TLS` | `False` | Enables SMTP TLS. |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` in production | Redirects HTTP requests to HTTPS. |
| `DJANGO_SESSION_COOKIE_SECURE` | `True` in production | Sends the session cookie over HTTPS only. |
| `DJANGO_CSRF_COOKIE_SECURE` | `True` in production | Sends the CSRF cookie over HTTPS only. |
| `DJANGO_SECURE_HSTS_SECONDS` | `31536000` in production | HSTS lifetime in seconds. |
| `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` | `True` in production | Applies HSTS to subdomains. |
| `DJANGO_SECURE_HSTS_PRELOAD` | `True` in production | Opts into HSTS preload behavior. |

Boolean values accept `1`, `true`, `yes`, or `on` in any letter case. Production security defaults are enabled automatically when `DJANGO_DEBUG=False`; only override them when your TLS and reverse-proxy setup requires it.

## Common commands

Run backend commands from the repository root with the virtual environment active:

| Command | Purpose |
| --- | --- |
| `python manage.py runserver` | Start the Django development server. |
| `python manage.py migrate` | Apply database migrations. |
| `python manage.py makemigrations` | Generate migrations after model changes. |
| `python manage.py createsuperuser` | Create an administrator account. |
| `python manage.py check` | Run Django's system checks. |

Run frontend commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot module replacement. |
| `npm run build` | Type-check and create the production bundle. |
| `npm run preview` | Preview the production bundle locally. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the frontend test suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

## API overview

All API routes use JSON unless an author request uploads an image, in which case the client sends multipart form data. Collection endpoints are paginated at 10 records per page unless noted otherwise.

### Public endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/posts/` | List published posts. Supports `page`, `search`, `author`, `category`, `tag`, `post_type`, and `ordering`. |
| `GET` | `/api/posts/{slug}/` | Retrieve a published post and increment its view count. |
| `GET` | `/api/posts/{slug}/comments/` | List approved comments. |
| `GET` | `/api/categories/` | List all categories without pagination. |
| `GET` | `/api/tags/` | List all tags without pagination. |
| `GET` | `/api/auth/csrf/` | Set the CSRF cookie used by the session-auth client. |
| `POST` | `/api/auth/register/` | Register a user and begin a session. |
| `POST` | `/api/auth/login/` | Begin a session with a username and password. |
| `GET` | `/api/auth/profiles/{username}/` | Retrieve a public author profile and contribution statistics. |
| `POST` | `/api/auth/password-reset/` | Request a one-use password-reset link. |
| `POST` | `/api/auth/password-reset/confirm/` | Set a new password using a valid UID and token. |

### Authenticated endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/logout/` | End the current session. |
| `GET`, `PATCH`, `PUT` | `/api/auth/me/` | Read or update the signed-in user's profile. |
| `POST` | `/api/posts/{slug}/comments/` | Add a comment to a published post. |
| `GET`, `POST` | `/api/saved-posts/` | List or save posts for the current user. |
| `DELETE` | `/api/saved-posts/{slug}/` | Remove a post from the current user's saved list. |
| `GET` | `/api/notifications/` | List the current user's notifications. |
| `GET` | `/api/notifications/unread-count/` | Get the unread notification count. |
| `PATCH` | `/api/notifications/{id}/` | Update a notification's read state. |
| `POST` | `/api/notifications/mark-all-read/` | Mark every notification as read. |
| `GET`, `POST` | `/api/dashboard/posts/` | List the current author's posts or create a draft. |
| `GET`, `PATCH`, `PUT`, `DELETE` | `/api/dashboard/posts/{id}/` | Manage an author-owned post. |
| `POST` | `/api/dashboard/posts/{id}/publish/` | Publish an author-owned draft or removed post. |
| `GET`, `POST` | `/api/dashboard/posts/{id}/blocks/` | List or add ordered content blocks. |
| `PUT` | `/api/dashboard/posts/{id}/blocks/reorder/` | Replace a post's block order. |
| `GET`, `PATCH`, `PUT`, `DELETE` | `/api/dashboard/posts/{id}/blocks/{block_id}/` | Manage one content block. |
| `GET` | `/api/dashboard/comments/` | List comments written by the current user. |

`ordering` accepts `newest` (the default) or `viewed`. `post_type` accepts `article`, `news`, `tutorial`, or `opinion`.

### Session and CSRF example

Before an unsafe unauthenticated request such as registration or login, request the CSRF cookie and return it in the `X-CSRFToken` header:

```bash
curl -c cookies.txt http://localhost:5173/api/auth/csrf/

curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(awk '$6 == "csrftoken" {print $7}' cookies.txt)" \
  -d '{"username":"reader","password":"your-password"}' \
  http://localhost:5173/api/auth/login/
```

The React client performs this flow automatically. The example targets Vite so the proxy preserves the same-origin development setup.

## Publishing and moderation

1. An author creates a private draft and adds post metadata and ordered content blocks.
2. Publishing makes the post immediately public and records its publication time.
3. Staff review posts and comments in Django Admin.
4. Removing content requires actionable moderation feedback and creates an in-app notification for its author.
5. Editing a removed post returns it to a private draft. The author can address the feedback and republish it.

Authors can only read and modify their own dashboard content. Public endpoints expose only posts whose status is `published` and whose publication time has arrived.

## Testing

The backend test configuration uses an in-memory SQLite database and a fast password hasher, so the suite does not need the development PostgreSQL database:

```bash
python manage.py test --settings=ThoughtHub.test_settings
```

Run the frontend quality checks from `frontend/`:

```bash
npm test
npm run lint
npm run build
```

## Project structure

```text
ThoughtHub/
├── Account/                 # Authentication, profiles, and password recovery
├── Blog/                    # Posts, blocks, comments, saves, notifications
│   └── migrations/          # Blog database migrations
├── ThoughtHub/              # Project settings, root URLs, WSGI, and ASGI
├── design/
│   ├── admin/               # Django Admin theme overrides
│   └── logos/               # Source SVG brand assets
├── frontend/
│   ├── public/              # Static frontend assets
│   └── src/
│       ├── api/             # Typed API client modules
│       ├── auth/            # Session state and protected routes
│       ├── components/      # Shared UI and editor components
│       └── pages/           # Public, account, dashboard, and staff pages
├── media/                   # Local user uploads; ignored by Git
├── .env.example             # Environment variable template
├── manage.py                # Django command entry point
└── requirements.txt         # Pinned Python dependencies
```

## Production notes

Complete deployment recipes are available for
[Alwaysdata Free](deploy/alwaysdata/README.md) and
[an Oracle Cloud VM](deploy/oracle/README.md). Before deploying elsewhere:

- Set `DJANGO_DEBUG=False` and generate a unique `DJANGO_SECRET_KEY`.
- Set the public hosts, frontend URL, and trusted CSRF origins precisely.
- Use strong PostgreSQL credentials and managed backups.
- Configure a real email backend for password recovery.
- Build the frontend with `npm run build` and serve `frontend/dist/` through a static host or reverse proxy.
- Serve uploaded media from persistent object storage or a durable media volume.
- Configure `STATIC_ROOT`, run `python manage.py collectstatic`, and serve the collected assets outside Django's development server.
- Configure the static host to fall back to `frontend/dist/index.html` for client-side routes such as `/posts/{slug}` and `/dashboard`.
- Put Django behind a production WSGI or ASGI server and HTTPS reverse proxy.
- Run `python manage.py check --deploy` with the production environment loaded.
- Review HSTS settings carefully before enabling preload; browsers retain that policy for the configured lifetime.

## Contributing

1. Fork the repository and create a focused feature branch.
2. Make the change with tests for new or changed behavior.
3. Run the backend and frontend checks listed in [Testing](#testing).
4. Keep migrations with the model changes that require them.
5. Open a pull request describing the problem, the solution, and any UI or API impact.

Please avoid committing `.env`, uploaded media, dependency directories, build output, or editor-specific files.

## License

No license file is currently included. Until one is added, the repository remains under the copyright holder's default rights; do not assume permission to copy, modify, or redistribute it.
