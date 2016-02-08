#!/bin/bash

docker build -t unittest-tutorial .
# Store the hash in order to make sure we adjust the time appropriately.
# On different hashes, assume the worst case and delete the dependencies and start fresh.
# On a missing .bundle folder, set the TRIES high too.
# Otherwise, don't have to try for so long.
NEW_GIT_HASH=$(git rev-parse HEAD)

FAIL=0
TRIES=10
if [ ! -f .docker_repo_hash ]; then
	echo "Detected no previous hash. Acting as first run"
elif [ "$(cat .docker_repo_hash)" != "$NEW_GIT_HASH" ]; then
	echo "Newer repo history Removing .bundle folder"
	echo "Initial run can take some time."
	rm -rf .bundle
	TRIES=60
elif [ ! -d ".bundle" ]; then
	# Will take a long time to install all the dependencies
	TRIES=60
	echo " Detected no .bundle folder. Initial run can take some time."
else
	echo "No changes detected. Starting normal"
fi
echo $NEW_GIT_HASH > .docker_repo_hash
DOCKER_ID=$(docker run -itd -p 4000:4000 -v $(pwd):/unit-testing-node unittest-tutorial)
echo "Waiting for server to come up."
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
# Let the user know that the shell is available but you have to press enter.
echo "Press the enter key to enter the container"
docker attach $DOCKER_ID
