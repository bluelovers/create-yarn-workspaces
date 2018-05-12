"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const findYarnWorkspaceRoot = require("find-yarn-workspace-root");
const path = require("path");
const pkgDir = require("pkg-dir");
const fs = require("fs");
function createYarnWorkspaces(cwd, options = {}) {
    if (cwd && typeof cwd != 'string') {
        options = cwd;
        cwd = options.cwd;
    }
    if (!cwd) {
        cwd = process.cwd();
    }
    cwd = path.resolve(cwd);
    let root = pkgDir.sync(cwd);
    let ws;
    try {
        ws = findYarnWorkspaceRoot(root);
    }
    catch (e) {
        console.log(e.toString());
        ws = null;
    }
    let targetPath = path.resolve(root || cwd);
    if (!options.ignoreExistsPackage && root) {
        console.warn(`already have package at "${root}", or use ignoreExistsPackage for overwrite it`);
        return false;
    }
    if (ws) {
        let bool = true;
        console.warn(`already have workspace at "${ws}"`);
        if (options.ignoreParentWorkspaces) {
            bool = isSamePath(targetPath, ws);
            if (!bool) {
                console.warn(`ignoreParentWorkspaces = true`);
            }
        }
        if (bool) {
            return false;
        }
    }
    return _createYarnWorkspaces(targetPath);
}
exports.createYarnWorkspaces = createYarnWorkspaces;
function isSamePath(p1, p2) {
    if (p1 === p2) {
        return true;
    }
    else if (!p1 || !p2) {
        return false;
    }
    let s = path.relative(p1, p2);
    return (s === '.' || s === '');
}
exports.isSamePath = isSamePath;
function _createYarnWorkspaces(targetPath) {
    console.log(`will create at ${targetPath}`);
    let pkg;
    let lerna;
    {
        let file = path.join(targetPath, 'lerna.json');
        if (fs.existsSync(file)) {
            let json = JSON.parse(fs.readFileSync(file).toString());
            if (json.packages && !Object.keys(json.packages).length) {
                json.packages = undefined;
            }
            lerna = json;
        }
    }
    let packages = lerna && lerna.packages || [
        "packages/*",
    ];
    let file = path.join(targetPath, 'package.json');
    if (!fs.existsSync(file)) {
        let name = path.basename(targetPath);
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath);
        }
        pkg = {
            "name": name,
            "version": "1.0.0",
            "private": true,
            "workspaces": packages,
            "scripts": {
                "test": "echo \"Error: no test specified\" && exit 1"
            },
            "resolutions": {}
        };
    }
    else {
        let json = JSON.parse(fs.readFileSync(file).toString());
        let workspaces;
        if (json.workspaces && Object.keys(json.workspaces).length) {
            workspaces = json.workspaces;
            packages = workspaces.packages || workspaces;
        }
        else {
            workspaces = packages;
        }
        pkg = Object.assign(json, {
            "private": true,
            "workspaces": workspaces,
        });
        pkg.resolutions = pkg.resolutions || {};
    }
    let s = JSON.stringify(pkg, null, 2);
    fs.writeFileSync(file, s);
    console.log(`make workspace package.json`);
    if (lerna && (packages != lerna.packages || lerna.npmClient !== 'yarn' || lerna.useWorkspaces !== true)) {
        let file = path.join(targetPath, 'lerna.json');
        lerna.packages = packages;
        lerna.npmClient = 'yarn';
        lerna.useWorkspaces = true;
        let s = JSON.stringify(lerna, null, 2);
        fs.writeFileSync(file, s);
        console.log(`update lerna.json`);
    }
    else if (!lerna) {
        let file = path.join(targetPath, 'lerna.json');
        lerna = {
            "packages": packages,
            "npmClient": "yarn",
            "useWorkspaces": true,
            "version": "independent",
        };
        let s = JSON.stringify(lerna, null, 2);
        fs.writeFileSync(file, s);
        console.log(`create lerna.json`);
    }
    createDirByPackages(targetPath, packages);
    return true;
}
exports._createYarnWorkspaces = _createYarnWorkspaces;
function createDirByPackages(cwd, packages) {
    return packages.some(function (value) {
        let bool;
        let s = value.split(/[\/\\]/)[0];
        if (!/[!?\*{}\[\]]/.test(s)) {
            let dir = path.join(cwd, s);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            return true;
        }
        return bool;
    });
}
exports.createDirByPackages = createDirByPackages;
exports.default = createYarnWorkspaces;
