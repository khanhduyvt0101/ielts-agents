set -ex
nx migrate latest
nx migrate --run-migrations --if-exists
pnpm i
pnpm -r up
