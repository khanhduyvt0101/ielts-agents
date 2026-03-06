set -ex
nx run-many -t teardown-local-services
rm -rf .local
nx reset
docker compose down -v --remove-orphans --rmi local
