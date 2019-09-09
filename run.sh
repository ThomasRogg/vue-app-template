#!/bin/bash
cd "$(dirname "$0")"

(sleep 5; open http://localhost:8000/) &
node server/main/index.js
