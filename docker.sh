#!/bin/bash
JEKYLL_LOG=/var/log/unit-testing-node.log
bundle install --path .bundle
./go serve -H 0.0.0.0 >> $JEKYLL_LOG 2>&1 &
echo Jekyll logs can be found at $JEKYLL_LOG
/bin/bash
