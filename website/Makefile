.DEFAULT_GOAL := help
PORT ?= 3000

.PHONY: help install dev run build start test typecheck

help:
	@printf '%s\n' \
	  'Website local commands (run inside website/, or use make -C website <command>)' \
	  '' \
	  'Requires: Node.js 20.9+ (24 recommended), npm, and GNU make.' \
	  'First run: make install; optionally cp .env.example .env.local for email configuration.' \
	  'Then: make dev and open http://localhost:3000. Stop with Ctrl+C.' \
	  'Use another port: make dev PORT=3001 (open http://localhost:3001).' \
	  '' \
	  '  make help       Show these instructions (also the default)' \
	  '  make install    Install exact dependencies from package-lock.json (npm ci)' \
	  '  make dev        Start development server with hot reload' \
	  '  make run        Alias for make dev' \
	  '  make build      Build the production website' \
	  '  make start      Serve production build; run make build first (supports PORT=)' \
	  '  make test       Run website tests' \
	  '  make typecheck  Check TypeScript types'

install:
	npm ci

dev:
	npm run dev -- --port $(PORT)

run: dev

build:
	npm run build

start:
	npm run start -- --port $(PORT)

test:
	npm test

typecheck:
	npm run typecheck
