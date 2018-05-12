#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const yargs = require("yargs");
const path = require("path");
const CWD = process.cwd();
let cli = yargs
    .default({})
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
    .command('$0', '', function (yargs) {
    let name = yargs.argv.name || yargs.argv._[0];
    if (name) {
        name = path.join(CWD, name);
    }
    else {
        name = CWD;
    }
    let bool = __1.default(name, {
        ignoreExistsPackage: !!yargs.argv.ignoreExistsPackage,
    });
    if (!bool) {
        yargs.showHelp();
    }
})
    .version()
    .argv;
