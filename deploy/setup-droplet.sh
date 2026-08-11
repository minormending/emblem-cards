#!/usr/bin/env bash
# One-shot droplet bootstrap for a multi-app deployment. Run as root on a
# fresh Ubuntu 22.04/24.04 droplet. Creates a non-root deploy user, installs
# Docker, hardens SSH, enables UFW + fail2ban + unattended security upgrades,
# creates /opt/apps/{_gateway,emblem,dcc} skeletons, and creates the shared
# `gateway` docker network.
#
# After this runs the droplet is ready for you to:
#   1. scp the Caddyfile + docker-compose.yml + landing/ into /opt/apps/_gateway/
#      and /opt/apps/emblem/
#   2. `docker login ghcr.io` with a read:packages token
#   3. `cd /opt/apps/_gateway && docker compose up -d`
#   4. `cd /opt/apps/emblem && docker compose up -d`
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/setup-droplet.sh) \
#        deploy "ssh-ed25519 AAAA... your-deploy-pubkey"

set -euo pipefail

DEPLOY_USER="${1:?deploy user required}"
SSH_PUBKEY="${2:?ssh public key required}"
APPS_DIR="/opt/apps"

if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

# ── System updates + unattended security upgrades ──
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y install \
  ca-certificates curl gnupg ufw fail2ban unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# ── Deploy user ──
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
echo "$SSH_PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"

# ── SSH hardening ──
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

# ── Docker (official repo) ──
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "$DEPLOY_USER"
systemctl enable --now docker

# ── Firewall ──
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Fail2ban: default jail.d covers sshd out of the box on Ubuntu ──
systemctl enable --now fail2ban

# ── App directory skeleton + shared docker network ──
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APPS_DIR"
# Slot dirs for every app the gateway routes to. Add an app by appending a
# directory here AND adding the matching network to the loop below AND adding
# the network to deploy/gateway/docker-compose.yml's `networks:` list.
for app in _gateway emblem dcc calcuken nail-salon nyc-lyfe auth; do
  install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APPS_DIR/$app"
done

# Per-app docker networks. Each app attaches only its own containers; the
# gateway Caddy attaches to every app's network. This prevents lateral
# movement between apps (a compromise of `dcc-web` cannot reach
# `emblem-server` because they sit on different networks). Keep this list
# in sync with deploy/gateway/docker-compose.yml's external network names.
for net in gateway_emblem gateway_dcc gateway_calcuken gateway_nailsalon gateway_nyc gateway_auth; do
  su - "$DEPLOY_USER" -c "docker network inspect $net >/dev/null 2>&1 || docker network create $net"
done

# ── Caddy data backup ──
# Drop the backup script into /opt/apps/_gateway/ alongside the compose
# file, and schedule it via the deploy user's crontab. Idempotent — adds
# the cron line only if it isn't already there.
BACKUP_DEST="/home/$DEPLOY_USER/caddy-backups"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$BACKUP_DEST"
CRON_LINE="0 4 * * * /opt/apps/_gateway/backup-caddy.sh $BACKUP_DEST >> $BACKUP_DEST/.cron.log 2>&1"
if ! su - "$DEPLOY_USER" -c "crontab -l 2>/dev/null | grep -F backup-caddy.sh" >/dev/null 2>&1; then
  su - "$DEPLOY_USER" -c "(crontab -l 2>/dev/null; echo '$CRON_LINE') | crontab -"
  echo "Installed daily Caddy backup cron (04:00 UTC → $BACKUP_DEST)"
else
  echo "Caddy backup cron already installed"
fi

echo
echo "── done ──"
echo "Deploy user:    $DEPLOY_USER"
echo "Apps dir:       $APPS_DIR"
echo "App networks:   gateway_emblem, gateway_dcc, gateway_calcuken, gateway_nailsalon, gateway_nyc, gateway_auth"
echo "Backup dest:    $BACKUP_DEST (daily 04:00 UTC)"
echo
echo "Next: scp _gateway/ and emblem/ files from deploy/ into $APPS_DIR/, then"
echo "  docker login ghcr.io                  # with read:packages PAT"
echo "  cd $APPS_DIR/_gateway && docker compose up -d"
echo "  cd $APPS_DIR/emblem   && docker compose up -d"
echo
echo "  scp deploy/backup-caddy.sh deploy@<host>:$APPS_DIR/_gateway/   # if not already present"
