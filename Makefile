# Droplet-side build + deploy commands. Run from the repo clone on the
# droplet (e.g. ~/emblem-cards). For the common "I pushed a fix, get it live"
# flow, run `make deploy`.
.PHONY: help deploy pull build build-server build-client up down restart logs ps prune

# Gateway mount point for the app. Must match the gateway Caddyfile.
BASE_PATH ?= /emblem/
SOCKET_PATH ?= /emblem/socket.io/
EMBLEM_DIR ?= /opt/apps/emblem
GATEWAY_DIR ?= /opt/apps/_gateway

help:
	@echo "make deploy         - pull, rebuild both images, restart emblem stack"
	@echo "make pull           - git pull from current branch"
	@echo "make build          - build both images (slow, ~5-10 min each)"
	@echo "make build-server   - build only the server image"
	@echo "make build-client   - build only the client image"
	@echo "make up             - docker compose up -d (gateway + emblem)"
	@echo "make down           - docker compose down (emblem only)"
	@echo "make restart        - restart emblem containers without rebuild"
	@echo "make logs           - tail logs for both emblem containers"
	@echo "make ps             - list running containers"
	@echo "make prune          - remove dangling images/containers/networks"

deploy: pull build restart
	@echo "── deploy complete. hard-refresh browsers to pick up client changes. ──"

pull:
	git pull

build: build-server build-client

build-server:
	docker build -f packages/server/Dockerfile -t emblem-server:local .

build-client:
	docker build -f packages/client/Dockerfile \
		--build-arg VITE_BASE_PATH=$(BASE_PATH) \
		--build-arg VITE_SOCKET_PATH=$(SOCKET_PATH) \
		-t emblem-client:local .

up:
	cd $(GATEWAY_DIR) && docker compose up -d
	cd $(EMBLEM_DIR)  && docker compose up -d

down:
	cd $(EMBLEM_DIR) && docker compose down

restart:
	cd $(EMBLEM_DIR) && docker compose up -d --force-recreate

logs:
	cd $(EMBLEM_DIR) && docker compose logs -f --tail=100

ps:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

prune:
	docker system prune -f
