set -ex
docker compose up -d --wait
mkdir -p .local
rm -f .local/.secrets
echo "PG_URL=\"postgresql://postgres:postgres@localhost:$(docker compose port pg 5432 | cut -d: -f2)/postgres\"" >> .local/.secrets
echo "REDIS_URL=\"redis://localhost:$(docker compose port redis 6379 | cut -d: -f2)\"" >> .local/.secrets
nx reset
nx run-many -t configure-local-services
