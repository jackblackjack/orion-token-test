#!/bin/bash
set -xeuf -o pipefail
echo off
exec 1>/dev/null 2>&2

PROJECT_NAME="orion-test"
RUNDIR="$(cd "$(dirname "$0")" && pwd)"

containers=`docker ps -aq`
if [[ -n "${containers/[ ]*\n/}" ]]; then
    docker-compose -p ${PROJECT_NAME} -f ${RUNDIR}/docker-compose.dev.yml down --remove-orphans
    docker-compose -p ${PROJECT_NAME} -f ${RUNDIR}/docker-compose.dev.yml rm -vs
fi
