# ── Local development ──────────────────────────────────────────────────
.PHONY: libs apk install dev dev-client dev-server test typecheck clean-apk

MOBILE_DIR   := packages/mobile
APK          := $(MOBILE_DIR)/android/app/build/outputs/apk/debug/app-debug.apk

libs:
	pnpm --filter @cards/shared --filter @cards/card-engine --filter @cards/battle-engine build

apk: libs
	cd $(MOBILE_DIR) && npx expo export:embed \
		--platform android \
		--entry-file index.ts \
		--bundle-output android/app/src/main/assets/index.android.bundle \
		--assets-dest android/app/src/main/res \
		--reset-cache
	cd $(MOBILE_DIR)/android && ./gradlew assembleDebug

install: apk
	adb install -r $(APK)

dev:
	pnpm dev

dev-client:
	pnpm --filter @cards/client dev

dev-server:
	pnpm --filter @cards/server dev

dev-mobile:
	pnpm --filter @cards/mobile start

test:
	pnpm test

typecheck:
	pnpm exec tsc --noEmit -p packages/shared/tsconfig.json
	pnpm exec tsc --noEmit -p packages/card-engine/tsconfig.json
	pnpm exec tsc --noEmit -p packages/battle-engine/tsconfig.json
	pnpm exec tsc --noEmit -p packages/client/tsconfig.json
	pnpm exec tsc --noEmit -p packages/server/tsconfig.json

clean-apk:
	cd $(MOBILE_DIR)/android && ./gradlew clean

# ── Droplet deploy ─────────────────────────────────────────────────────
# Run from the repo clone on the droplet (e.g. ~/emblem-cards).
# For the common "I pushed a fix, get it live" flow, run `make deploy`.
.PHONY: help deploy pull build build-server build-client up down restart logs ps prune

# Gateway mount point for the app. Must match the gateway Caddyfile.
BASE_PATH ?= /emblem/
SOCKET_PATH ?= /emblem/socket.io/
EMBLEM_DIR ?= /opt/apps/emblem
GATEWAY_DIR ?= /opt/apps/_gateway

help:
	@echo ""
	@echo "  Local development"
	@echo "  ─────────────────"
	@echo "  make libs          - build shared packages (shared, card-engine, battle-engine)"
	@echo "  make apk           - build debug APK (builds libs first)"
	@echo "  make install       - build APK and install to connected Android device"
	@echo "  make dev           - start all dev servers (turbo)"
	@echo "  make dev-client    - start web client dev server"
	@echo "  make dev-server    - start game server in watch mode"
	@echo "  make dev-mobile    - start Expo/Metro dev server"
	@echo "  make test          - run all tests"
	@echo "  make typecheck     - typecheck all packages"
	@echo "  make clean-apk     - clean Android build artifacts"
	@echo ""
	@echo "  Droplet deploy"
	@echo "  ──────────────"
	@echo "  make deploy        - pull, rebuild both images, restart emblem stack"
	@echo "  make pull          - git pull from current branch"
	@echo "  make build         - build both images (slow, ~5-10 min each)"
	@echo "  make build-server  - build only the server image"
	@echo "  make build-client  - build only the client image"
	@echo "  make up            - docker compose up -d (gateway + emblem)"
	@echo "  make down          - docker compose down (emblem only)"
	@echo "  make restart       - restart emblem containers without rebuild"
	@echo "  make logs          - tail logs for both emblem containers"
	@echo "  make ps            - list running containers"
	@echo "  make prune         - remove dangling images/containers/networks"
	@echo ""

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
