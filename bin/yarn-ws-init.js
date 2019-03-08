#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const yargs = require("yargs");
const path = require("path");
const CWD = process.cwd();
let cli = yargs
    .default({
//input: process.cwd(),
})
    .option('name', {
    alias: ['n'],
    requiresArg: true,
    normalize: true,
    type: 'string',
})
    .option('ignoreExistsPackage', {
    boolean: true,
    alias: ['i'],
})
    .option('ignoreParentWorkspaces', {
    boolean: true,
})
    .option('debug', {
    boolean: true,
})
    .command('$0', '', function (yargs) {
    let name = yargs.argv.name || yargs.argv._[0];
    if (name) {
        name = path.join(CWD, name);
    }
    else {
        name = CWD;
    }
    //console.log(CWD, yargs.argv);
    yargs.argv.debug && __1.console.debug(yargs.argv);
    let bool = __1.default(name, {
        ignoreExistsPackage: !!yargs.argv.ignoreExistsPackage,
        ignoreParentWorkspaces: !!yargs.argv.ignoreParentWorkspaces,
        debug: !!yargs.argv.debug,
    });
    //console.log(77777777777, bool);
    if (!bool) {
        console.log('\n');
        yargs.showHelp();
    }
    else {
        __1.console.success(`done`);
    }
})
    .version()
    .help()
    .argv;
//# sourceMappingURL=yarn-ws-init.js.map