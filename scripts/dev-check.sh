#!/usr/bin/env bash
set -euo pipefail

echo "Checking MySQL container..."
docker compose up -d mysql

echo "Generating Prisma client..."
pnpm db:generate

echo "Building database package..."
pnpm --filter @cactus/database build

echo "Running type checks..."
pnpm --filter @cactus/shared typecheck
pnpm --filter @cactus/ui typecheck
pnpm --filter @cactus/api typecheck
pnpm --filter @cactus/web typecheck

echo "Foundation check completed successfully."
