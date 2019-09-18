

const fs            = require('fs');
const path          = require('path');
const child_process = require('child_process');

const config        = require('./config/config-launcher');

async function start() {
    let pid;
    try {
        pid = await fs.promises.readFile(config.PID_FILE, 'utf8');
        process.kill(pid, 0);

        // Already running
        return;
    } catch(err) {
        if(err.code != 'ENOENT' && err.code != 'ESRCH')
            throw err;
    }

    let params = [
        '--max-old-space-size=' + config.MEM_CEILING_MB,
        path.join(__dirname, 'server/main/index'),
        'production'
    ];
    let child = child_process.spawn(process.argv[0], params, {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
    });
    child.unref();

    await fs.promises.writeFile(config.PID_FILE, child.pid);
}

async function stop() {
    let pid;
    try {
        pid = await fs.promises.readFile(config.PID_FILE, 'utf8');
    } catch(err) {
        if(err.code == 'ENOENT')
            return;

        throw err;
    }

    for(let i = 0; i < 40; i++) {
        try {
            process.kill(pid);
        } catch(err) {
            if(err.code == 'ESRCH') {
                // No longer running
                await fs.promises.unlink(config.PID_FILE);
                return;
            }

            throw err;
        }

        // Wait 250 ms
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    await fs.promises.unlink(config.PID_FILE);

    console.error('Process not responding... Forcing stop.')
    try {
        process.kill(pid, 'SIGKILL');
    } catch(err) {
        if(err.code == 'ESRCH') {
            // No longer running
            return;
        }

        throw err;
    }
}

let args = process.argv.slice(2);
if(args.length == 1 && args[0] == 'stop') {
    stop().catch(console.error);
} else if(args.length == 1 && args[0] == 'start') {
    start().catch(console.error);
} else if(args.length == 1 && args[0] == 'restart') {
    stop().then(start).catch(console.error);
} else {
    let cmd = process.argv[0];

    process.argv[0] = '--max-old-space-size=' + config.MEM_CEILING_MB;
    process.argv[1] = path.join(__dirname, 'server/main/index');

    child_process.spawn(cmd, process.argv, {
        stdio: ['inherit', 'inherit', 'inherit']
    });
}