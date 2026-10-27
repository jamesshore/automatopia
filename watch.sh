#!/bin/sh

. _build/prebuild.sh
while node --enable-source-maps _build/watch.ts "$@"; do
	echo "Restarting..."
  . _build/prebuild.sh
done
