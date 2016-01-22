#!/bin/bash

docker build -t unittest-tutorial .
echo Open your browser to $(docker-machine ip $DOCKER_MACHINE_NAME):4000
DOCKER_ID=$(docker run -itd -p 4000:4000 -v $(pwd):/unit-testing-node unittest-tutorial)
echo "Sleeping to let server come up"
sleep 3
open "http://$(docker-machine ip $DOCKER_MACHINE_NAME):4000" &
docker attach $DOCKER_ID
