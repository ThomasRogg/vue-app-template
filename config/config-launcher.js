"use strict";

const path = require('path');

process.title = 'vue-app-template-launcher';

exports.MEM_CEILING_MB = 2048;

exports.PID_FILE = path.join(__dirname, '../daemon.pid');