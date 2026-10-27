#!/bin/sh

. _build/prebuild.sh
while node _build/watch.ts "$@"; do
	echo "Restarting..."
  . _build/prebuild.sh
done
