#!/bin/bash
set -xeuf -o pipefail
echo off

PROJECT_NAME="orion-test"
RUNDIR="$(cd "$(dirname "$0")" && pwd)"
BEFORE_UP_CMD="${RUNDIR}/dev-down.sh"

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
bash "${BEFORE_UP_CMD}"

#$(which find) ${RUNDIR}/data -type d -exec chmod 0777 {} \;
#$(which find) ${RUNDIR}/data -type f -exec chmod 0666 {} \;
#$(which find) ${RUNDIR}/orion-test/src/migrations/* -exec chmod 0666 {} \;

docker-compose -p ${PROJECT_NAME} -f ${RUNDIR}/docker-compose.dev.yml up -d --build --force-recreate
docker-compose -p ${PROJECT_NAME} -f ${RUNDIR}/docker-compose.dev.yml ps
