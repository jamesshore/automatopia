#!/bin/sh

. _build/prebuild.sh
while node _build/watch.js "$@"; do
	echo "Restarting..."
  . _build/prebuild.sh
done
