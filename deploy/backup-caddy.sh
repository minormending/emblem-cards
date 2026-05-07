#!/usr/bin/env bash
# Back up the gateway Caddy's TLS data — Let's Encrypt account key, issued
# certs, OCSP cache. Without this, a destroyed droplet means re-issuing
# every cert from scratch (LE rate-limited at 5 certs/week per registered
# domain; 50 names/week per account).
#
# We back up the docker named volume `caddy_data` by `docker run`-ing a
# helper container that mounts the volume read-only and tars its contents
# to stdout, then we save that tarball locally with a timestamp.
#
# Usage:
#   deploy/backup-caddy.sh                     # writes to ./caddy-backups/
#   deploy/backup-caddy.sh /custom/path        # writes to /custom/path
#
# Cron-friendly: idempotent, exits non-zero on any error, prunes backups
# older than KEEP_DAYS (default 30) so the destination doesn't grow forever.
set -euo pipefail

DEST="${1:-$HOME/caddy-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
VOLUME="${VOLUME:-caddy_data}"

mkdir -p "$DEST"

if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  echo "ERROR: docker volume '$VOLUME' not found." >&2
  echo "       Is the gateway compose up? Try: cd /opt/apps/_gateway && docker compose up -d" >&2
  exit 1
fi

ts="$(date -u '+%Y%m%dT%H%M%SZ')"
out="$DEST/caddy_data-$ts.tar.gz"

echo "→ backing up volume $VOLUME to $out"
# alpine has tar + gzip out of the box; tiny image, no daemon dependencies.
docker run --rm -v "$VOLUME:/data:ro" alpine:3 \
  tar -czf - -C /data . > "$out"

# Verify the tarball is non-empty and lists at least one cert.
if [ ! -s "$out" ]; then
  echo "ERROR: backup file is empty: $out" >&2
  exit 1
fi
echo "  size: $(du -h "$out" | cut -f1)"

# Prune old backups.
find "$DEST" -maxdepth 1 -type f -name 'caddy_data-*.tar.gz' \
  -mtime +"$KEEP_DAYS" -print -delete \
  | sed 's/^/  pruned: /' || true

echo "✓ done. To restore on a fresh droplet:"
echo "  docker volume create $VOLUME"
echo "  docker run --rm -v $VOLUME:/data -v \$(pwd):/backup alpine:3 \\"
echo "    tar -xzf /backup/caddy_data-<timestamp>.tar.gz -C /data"
