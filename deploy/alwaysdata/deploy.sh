#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
ACCOUNT=${ALWAYSDATA_ACCOUNT:-${1:-}}

if [ -z "$ACCOUNT" ]; then
    echo "Usage: ALWAYSDATA_ACCOUNT=your-account $0" >&2
    exit 2
fi

case "$ACCOUNT" in
    *[!A-Za-z0-9_-]*)
        echo "ALWAYSDATA_ACCOUNT contains unsupported characters." >&2
        exit 2
        ;;
esac

SSH_USER=${ALWAYSDATA_SSH_USER:-$ACCOUNT}
SSH_HOST=${ALWAYSDATA_SSH_HOST:-ssh-$ACCOUNT.alwaysdata.net}
REMOTE_APP_DIR=${ALWAYSDATA_APP_DIR:-www/thoughthub}
ENV_FILE=${ALWAYSDATA_ENV_FILE:-$PROJECT_ROOT/deploy/alwaysdata/alwaysdata.env}
REMOTE=${SSH_USER}@${SSH_HOST}

case "$REMOTE_APP_DIR" in
    *[!A-Za-z0-9_./-]*)
        echo "ALWAYSDATA_APP_DIR contains unsupported characters." >&2
        exit 2
        ;;
esac

for command_name in npm rsync ssh; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Required command is missing: $command_name" >&2
        exit 1
    fi
done

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing production environment file: $ENV_FILE" >&2
    echo "Copy alwaysdata.env.example, fill it in, and try again." >&2
    exit 1
fi

if grep -Eq 'ACCOUNT|replace-with-' "$ENV_FILE"; then
    echo "The production environment file still contains placeholders." >&2
    exit 1
fi

echo "Building the React frontend locally..."
npm ci --prefix "$PROJECT_ROOT/frontend"
npm run build --prefix "$PROJECT_ROOT/frontend"

echo "Preparing $REMOTE:$REMOTE_APP_DIR..."
ssh "$REMOTE" "mkdir -p '$REMOTE_APP_DIR/frontend/dist' '$REMOTE_APP_DIR/media'"

echo "Uploading application source..."
rsync -az \
    --exclude '.git/' \
    --exclude '.env' \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    --exclude 'backups/' \
    --exclude 'frontend/dist/' \
    --exclude 'frontend/node_modules/' \
    --exclude 'media/' \
    --exclude 'staticfiles/' \
    "$PROJECT_ROOT/" "$REMOTE:$REMOTE_APP_DIR/"

# frontend/dist is generated output, so removing obsolete hashed assets here is
# safe and prevents repeated deployments from consuming the free disk quota.
rsync -az --delete \
    "$PROJECT_ROOT/frontend/dist/" \
    "$REMOTE:$REMOTE_APP_DIR/frontend/dist/"
rsync -az "$ENV_FILE" "$REMOTE:$REMOTE_APP_DIR/.env"

echo "Installing runtime dependencies and updating Django..."
ssh "$REMOTE" "
    set -eu
    cd '$REMOTE_APP_DIR'
    chmod 600 .env
    if [ ! -x .venv/bin/python ]; then
        PYTHON_VERSION=3.14 python -m venv .venv
    fi
    .venv/bin/python -m pip install --no-cache-dir -r requirements-production.txt
    .venv/bin/python manage.py migrate --noinput
    .venv/bin/python manage.py collectstatic --clear --noinput
    .venv/bin/python manage.py check --deploy
"

echo "Deployment files are ready. Restart the Python WSGI site in Web > Sites."
echo "Then visit https://$ACCOUNT.alwaysdata.net/healthz/."
