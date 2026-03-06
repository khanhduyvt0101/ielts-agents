if [ -z "$CI" ]; then
  set -ex
  husky
  nx run-many -t configure-local-dependencies
fi
