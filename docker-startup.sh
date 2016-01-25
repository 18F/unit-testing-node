#!/bin/bash

docker build -t unittest-tutorial .
FAIL=0
TRIES=10
if [ ! -d ".bundle" ]; then
	# Will take a long time to install all the dependencies
	TRIES=30
fi
DOCKER_ID=$(docker run -itd -p 4000:4000 -v $(pwd):/unit-testing-node unittest-tutorial)
echo "Waiting for server to come up. Initial run can take some time."
while true; do
	curl --output /dev/null --silent --head --fail http://$(docker-machine ip $DOCKER_MACHINE_NAME):4000
	if [ $? -eq 0 ]; then
		echo "Server is up"
		break
	else
		FAIL=$[FAIL +1]
		sleep 5
	fi
	if [ $FAIL -eq $TRIES ]; then
		echo "Server could not be found. Exiting..."
		docker rm -f $DOCKER_ID
		exit
	fi
done
echo "Open your browser to: http://$(docker-machine ip $DOCKER_MACHINE_NAME):4000"
docker attach $DOCKER_ID
