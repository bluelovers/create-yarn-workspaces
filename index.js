"use strict";
/**
 * Created by user on 2018/5/13/013.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const findYarnWorkspaceRoot = require("find-yarn-workspace-root2");
const path = require("path");
const pkgDir = require("pkg-dir");
const fs = require("fs-extra");
const debug_color2_1 = require("debug-color2");
const static_file_1 = require("@yarn-tool/static-file");
exports.console = new debug_color2_1.Console2(null, {
    label: true,
    time: true,
});
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
        // @FIXME 一個奇怪的BUG 不使用 try 的話 在 NPX 底下就會出現無訊息的停止
        ws = findYarnWorkspaceRoot(root);
    }
    catch (e) {
        exports.console.log(e.toString());
        ws = null;
    }
    let targetPath = path.resolve(root || cwd);
    options.debug && exports.console.debug({
        targetPath,
        ws,
        options,
    });
    if (!options.ignoreExistsPackage && root) {
        exports.console.error(`already have package at "${root}", or use ignoreExistsPackage for overwrite it`);
        return false;
    }
    else if (root) {
        exports.console.warn(`ignore exists package "${root}"`);
    }
    if (ws) {
        let bool = true;
        exports.console.warn(`detect exists workspace "${ws}"`);
        if (options.ignoreParentWorkspaces) {
            bool = isSamePath(targetPath, ws);
            if (!bool) {
                exports.console.warn(`ignoreParentWorkspaces = true`);
            }
            else {
                exports.console.error(`target path already is workspace`);
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
function _createYarnWorkspaces(targetPath, options = {}) {
    exports.console.info(`create in target path "${targetPath}"`);
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
        pkg = Object.assign(getDefaultPackageJson(name), {
            name,
            workspaces: packages,
        });
        if (options.initPackageJson) {
            let ret = options.initPackageJson(pkg);
            if (ret) {
                pkg = ret;
            }
        }
    }
    else {
        let json = JSON.parse(fs.readFileSync(file).toString());
        let workspaces;
        if (json.workspaces && Object.keys(json.workspaces).length) {
            workspaces = json.workspaces;
            // https://yarnpkg.com/blog/2018/02/15/nohoist/
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
    exports.console.success(`create workspace package.json`);
    if (lerna && (packages != lerna.packages || lerna.npmClient !== 'yarn' || lerna.useWorkspaces !== true)) {
        let file = path.join(targetPath, 'lerna.json');
        lerna.packages = packages;
        lerna.npmClient = 'yarn';
        lerna.useWorkspaces = true;
        let s = JSON.stringify(lerna, null, 2);
        fs.writeFileSync(file, s);
        exports.console.info(`update lerna.json`);
    }
    else if (!lerna) {
        let file = path.join(targetPath, 'lerna.json');
        lerna = {
            "packages": packages,
            "command": {
                "publish": {
                    "ignoreChanges": ["node_modules"],
                    "message": "chore(release): publish"
                }
            },
            "npmClient": "yarn",
            "useWorkspaces": true,
            "version": "independent",
        };
        let s = JSON.stringify(lerna, null, 2);
        fs.writeFileSync(file, s);
        exports.console.success(`create lerna.json`);
    }
    if (!fs.existsSync(path.join(targetPath, 'tsconfig.json'))) {
        fs.writeFileSync(path.join(targetPath, 'tsconfig.json'), JSON.stringify(getDefaultTsconfig(), null, 2));
        exports.console.success(`create tsconfig.json`);
    }
    static_file_1.default({
        cwd: targetPath,
    });
    createDirByPackages(targetPath, packages);
    return true;
}
exports._createYarnWorkspaces = _createYarnWorkspaces;
function getDefaultTsconfig() {
    return {
        extends: "@bluelovers/tsconfig/esm/esModuleInterop"
    };
}
exports.getDefaultTsconfig = getDefaultTsconfig;
function getDefaultPackageJson(name) {
    return {
        "name": name,
        "version": "1.0.0",
        "private": true,
        "workspaces": [
            "packages/*"
        ],
        "scripts": {
            "lerna:publish": "npx lerna publish",
            "lerna:publish:yes": "npx lerna publish --yes --cd-version patch",
            "prepublish:lockfile": "npx sync-lockfile .",
            "ncu": "npx yarn-tool ncu -u",
            "sort-package-json": "npx yarn-tool sort",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "devDependencies": {
            "@types/node": "*",
            "@bluelovers/tsconfig": "latest"
        },
        "peerDependencies": {
            "lerna": "^3"
        },
        "resolutions": {}
    };
}
exports.getDefaultPackageJson = getDefaultPackageJson;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBRUgsbUVBQW9FO0FBQ3BFLDZCQUE4QjtBQUM5QixrQ0FBbUM7QUFDbkMsK0JBQWdDO0FBRWhDLCtDQUF3QztBQUN4Qyx3REFBaUY7QUFFcEUsUUFBQSxPQUFPLEdBQUcsSUFBSSx1QkFBUSxDQUFDLElBQUksRUFBRTtJQUN6QyxLQUFLLEVBQUUsSUFBSTtJQUNYLElBQUksRUFBRSxJQUFJO0NBQ1YsQ0FBQyxDQUFDO0FBY0gsU0FBZ0Isb0JBQW9CLENBQUMsR0FBWSxFQUFFLFVBQW9CLEVBQUU7SUFFeEUsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLElBQUksUUFBUSxFQUNqQztRQUNDLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztLQUNsQjtJQUVELElBQUksQ0FBQyxHQUFHLEVBQ1I7UUFDQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ3BCO0lBRUQsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFeEIsSUFBSSxJQUFJLEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVwQyxJQUFJLEVBQVUsQ0FBQztJQUVmLElBQ0E7UUFDQyxnREFBZ0Q7UUFDaEQsRUFBRSxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2pDO0lBQ0QsT0FBTyxDQUFDLEVBQ1I7UUFDQyxlQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRTFCLEVBQUUsR0FBRyxJQUFJLENBQUM7S0FDVjtJQUVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTNDLE9BQU8sQ0FBQyxL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QW1CLEVBQUUsb0JBQW9CO1lBQ3pDLE1BQU0sRUFBRSw2Q0FBNkM7U0FDckQ7UUFDRCxpQkFBaUIsRUFBRTtZQUNsQixhQUFhLEVBQUUsR0FBRztZQUNsQixzQkFBc0IsRUFBRSxRQUFRO1NBQ2hDO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGFBQWEsRUFBRSxFQUFFO0tBQ2pCLENBQUM7QUFDSCxDQUFDO0FBdkNELHNEQXVDQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxRQUFrQjtJQUVsRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxLQUFLO1FBRW5DLElBQUksSUFBYSxDQUFDO1FBRWxCLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQzNCO1lBQ0MsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFNUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQ3ZCO2dCQUNDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDbEI7WUFFRCxPQUFPLElBQUksQ0FBQztTQUNaO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUF0QkQsa0RBc0JDO0FBRUQsa0JBQWUsb0JBQW9CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENyZWF0ZWQgYnkgdXNlciBvbiAyMDE4LzUvMTMvMDEzLlxuICovXG5cbmltcG9ydCBmaW5kWWFybldvcmtzcGFjZVJvb3QgPSByZXF1aXJlKCdmaW5kLXlhcm4td29ya3NwYWNlLXJvb3QyJyk7XG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmltcG9ydCBwa2dEaXIgPSByZXF1aXJlKCdwa2ctZGlyJyk7XG5pbXBvcnQgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuXG5pbXBvcnQgeyBDb25zb2xlMiB9IGZyb20gJ2RlYnVnLWNvbG9yMic7XG5pbXBvcnQgY29weVN0YXRpY0ZpbGVzLCB7IGRlZmF1bHRDb3B5U3RhdGljRmlsZXMgfSBmcm9tICdAeWFybi10b29sL3N0YXRpYy1maWxlJztcblxuZXhwb3J0IGNvbnN0IGNvbnNvbGUgPSBuZXcgQ29uc29sZTIobnVsbCwge1xuXHRsYWJlbDogdHJ1ZSxcblx0dGltZTogdHJ1ZSxcbn0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElPcHRpb25zXG57XG5cdGN3ZD86IHN0cmluZyxcblxuXHRpZ25vcmVQYXJlbnRXb3Jrc3BhY2VzPzogYm9vbGVhbixcblx0aWdub3JlRXhpc3RzUGFja2FnZT86IGJvb2xlYW4sXG5cblx0aW5pdFBhY2thZ2VKc29uPzxUID0gYW55PihjdXJyZW50OiBSZXR1cm5UeXBlPHR5cGVvZiBnZXREZWZhdWx0UGFja2FnZUpzb24+KTogUmV0dXJuVHlwZTx0eXBlb2YgZ2V0RGVmYXVsdFBhY2thZ2VKc29uPiB8IFJldHVyblR5cGU8dHlwZW9mIGdldERlZmF1bHRQYWNrYWdlSnNvbj4gJiBULFxuXG5cdGRlYnVnPzogYm9vbGVhbixcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVlhcm5Xb3Jrc3BhY2VzKGN3ZD86IHN0cmluZywgb3B0aW9uczogSU9wdGlvbnMgPSB7fSlcbntcblx0aWYgKGN3ZCAmJiB0eXBlb2YgY3dkICE9ICdzdHJpbmcnKVxuXHR7XG5cdFx0b3B0aW9ucyA9IGN3ZDtcblx0XHRjd2QgPSBvcHRpb25zLmN3ZDtcblx0fVxuXG5cdGlmICghY3dkKVxuXHR7XG5cdFx0Y3dkID0gcHJvY2Vzcy5jd2QoKTtcblx0fVxuXG5cdGN3ZCA9IHBhdGgucmVzb2x2ZShjd2QpO1xuXG5cdGxldCByb290OiBzdHJpbmcgPSBwa2dEaXIuc3luYyhjd2QpO1xuXG5cdGxldCB3czogc3RyaW5nO1xuXG5cdHRyeVxuXHR7XG5cdFx0Ly8gQEZJWE1FIOS4gOWAi+Wlh+aAqueahEJVRyDkuI3kvb/nlKggdHJ5IOeahOipsSDlnKggTlBYIOW6leS4i+Wwseacg+WHuuePvueEoeioiuaBr+eahOWBnOatolxuXHRcdHdzID0gZmluZFlhcm5Xb3Jrc3BhY2VSb290KHJvb3QpO1xuXHR9XG5cdGNhdGNoIChlKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coZS50b1N0cmluZygpKTtcblxuXHRcdHdzID0gbnVsbDtcblx0fVxuXG5cdGxldCB0YXJnZXRQYXRoID0gcGF0aC5yZXNvbHZlKHJvb3QgfHwgY3dkKTtcblxuXHRvcHRpb25zLmRlYnVnICYmIGNvbnNvbGUuZGVidWcoe1xuXHRcdHRhcmdldFBhdGgsXG5cdFx0d3MsXG5cdFx0b3B0aW9ucyxcblx0fSk7XG5cblx0aWYgKCFvcHRpb25zLmlnbm9yZUV4aXN0c1BhY2thZ2UgJiYgcm9vdClcblx0e1xuXHRcdGNvbnNvbGUuZXJyb3IoYGFscmVhZHkgaGF2ZSBwYWNrYWdlIGF0IFwiJHtyb290fVwiLCBvciB1c2UgaWdub3JlRXhpc3RzUGFja2FnZSBmb3Igb3ZlcndyaXRlIGl0YCk7XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0ZWxzZSBpZiAocm9vdClcblx0e1xuXHRcdGNvbnNvbGUud2FybihgaWdub3JlIGV4aXN0cyBwYWNrYWdlIFwiJHtyb290fVwiYCk7XG5cdH1cblxuXHRpZiAod3MpXG5cdHtcblx0XHRsZXQgYm9vbDogYm9vbGVhbiA9IHRydWU7XG5cblx0XHRjb25zb2xlLndhcm4oYGRldGVjdCBleGlzdHMgd29ya3NwYWNlIFwiJHt3c31cImApO1xuXG5cdFx0aWYgKG9wdGlvbnMuaWdub3JlUGFyZW50V29ya3NwYWNlcylcblx0XHR7XG5cdFx0XHRib29sID0gaXNTYW1lUGF0aCh0YXJnZXRQYXRoLCB3cyk7XG5cblx0XHRcdGlmICghYm9vbClcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBpZ25vcmVQYXJlbnRXb3Jrc3BhY2VzID0gdHJ1ZWApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGB0YXJnZXQgcGF0aCBhbHJlYWR5IGlzIHdvcmtzcGFjZWApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChib29sKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gX2NyZWF0ZVlhcm5Xb3Jrc3BhY2VzKHRhcmdldFBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTYW1lUGF0aChwMTogc3RyaW5nLCBwMjogc3RyaW5nKVxue1xuXHRpZiAocDEgPT09IHAyKVxuXHR7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0ZWxzZSBpZiAoIXAxIHx8ICFwMilcblx0e1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGxldCBzID0gcGF0aC5yZWxhdGl2ZShwMSwgcDIpO1xuXHRyZXR1cm4gKHMgPT09ICcuJyB8fCBzID09PSAnJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfY3JlYXRlWWFybldvcmtzcGFjZXModGFyZ2V0UGF0aDogc3RyaW5nLCBvcHRpb25zOiBJT3B0aW9ucyA9IHt9KVxue1xuXHRjb25zb2xlLmluZm8oYGNyZWF0ZSBpbiB0YXJnZXQgcGF0aCBcIiR7dGFyZ2V0UGF0aH1cImApO1xuXG5cdGxldCBwa2c6IFJldHVyblR5cGU8dHlwZW9mIGdldERlZmF1bHRQYWNrYWdlSnNvbj47XG5cblx0bGV0IGxlcm5hO1xuXG5cdHtcblx0XHRsZXQgZmlsZSA9IHBhdGguam9pbih0YXJnZXRQYXRoLCAnbGVybmEuanNvbicpO1xuXG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMoZmlsZSkpXG5cdFx0e1xuXHRcdFx0bGV0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlKS50b1N0cmluZygpKTtcblxuXHRcdFx0aWYgKGpzb24ucGFja2FnZXMgJiYgIU9iamVjdC5rZXlzKGpzb24ucGFja2FnZXMpLmxlbmd0aClcblx0XHRcdHtcblx0XHRcdFx0anNvbi5wYWNrYWdlcyA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblxuXHRcdFx0bGVybmEgPSBqc29uO1xuXHRcdH1cblx0fVxuXG5cdGxldCBwYWNrYWdlcyA9IGxlcm5hICYmIGxlcm5hLnBhY2thZ2VzIHx8IFtcblx0XHRcInBhY2thZ2VzLypcIixcblx0XTtcblxuXHRsZXQgZmlsZSA9IHBhdGguam9pbih0YXJnZXRQYXRoLCAncGFja2FnZS5qc29uJyk7XG5cblx0aWYgKCFmcy5leGlzdHNTeW5jKGZpbGUpKVxuXHR7XG5cdFx0bGV0IG5hbWUgPSBwYXRoLmJhc2VuYW1lKHRhcmdldFBhdGgpO1xuXG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldFBhdGgpKVxuXHRcdHtcblx0XHRcdGZzLm1rZGlyU3luYyh0YXJnZXRQYXRoKTtcblx0XHR9XG5cblx0XHRwa2cgPSBPYmplY3QuYXNzaWduKGdldERlZmF1bHRQYWNrYWdlSnNvbihuYW1lKSwge1xuXHRcdFx0bmFtZSxcblx0XHRcdHdvcmtzcGFjZXM6IHBhY2thZ2VzLFxuXHRcdH0pO1xuXG5cdFx0aWYgKG9wdGlvbnMuaW5pdFBhY2thZ2VKc29uKVxuXHRcdHtcblx0XHRcdGxldCByZXQgPSBvcHRpb25zLmluaXRQYWNrYWdlSnNvbihwa2cpO1xuXG5cdFx0XHRpZiAocmV0KVxuXHRcdFx0e1xuXHRcdFx0XHRwa2cgPSByZXQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGVsc2Vcblx0e1xuXHRcdGxldCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZSkudG9TdHJpbmcoKSk7XG5cblx0XHRsZXQgd29ya3NwYWNlcztcblxuXHRcdGlmIChqc29uLndvcmtzcGFjZXMgJiYgT2JqZWN0LmtleXMoanNvbi53b3Jrc3BhY2VzKS5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0d29ya3NwYWNlcyA9IGpzb24ud29ya3NwYWNlcztcblxuXHRcdFx0Ly8gaHR0cHM6Ly95YXJucGtnLmNvbS9ibG9nLzIwMTgvMDIvMTUvbm9ob2lzdC9cblx0XHRcdHBhY2thZ2VzID0gd29ya3NwYWNlcy5wYWNrYWdlcyB8fCB3b3Jrc3BhY2VzO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0d29ya3NwYWNlcyA9IHBhY2thZ2VzO1xuXHRcdH1cblxuXHRcdHBrZyA9IE9iamVjdC5hc3NpZ24oanNvbiwge1xuXHRcdFx0XCJwcml2YXRlXCI6IHRydWUsXG5cdFx0XHRcIndvcmtzcGFjZXNcIjogd29ya3NwYWNlcyxcblx0XHR9KTtcblxuXHRcdHBrZy5yZXNvbHV0aW9ucyA9IHBrZy5yZXNvbHV0aW9ucyB8fCB7fTtcblx0fVxuXG5cdGxldCBzID0gSlNPTi5zdHJpbmdpZnkocGtnLCBudWxsLCAyKTtcblx0ZnMud3JpdGVGaWxlU3luYyhmaWxlLCBzKTtcblxuXHRjb25zb2xlLnN1Y2Nlc3MoYGNyZWF0ZSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uYCk7XG5cblx0aWYgKGxlcm5hICYmIChwYWNrYWdlcyAhPSBsZXJuYS5wYWNrYWdlcyB8fCBsZXJuYS5ucG1DbGllbnQgIT09ICd5YXJuJyB8fCBsZXJuYS51c2VXb3Jrc3BhY2VzICE9PSB0cnVlKSlcblx0e1xuXHRcdGxldCBmaWxlID0gcGF0aC5qb2luKHRhcmdldFBhdGgsICdsZXJuYS5qc29uJyk7XG5cblx0XHRsZXJuYS5wYWNrYWdlcyA9IHBhY2thZ2VzO1xuXHRcdGxlcm5hLm5wbUNsaWVudCA9ICd5YXJuJztcblx0XHRsZXJuYS51c2VXb3Jrc3BhY2VzID0gdHJ1ZTtcblxuXHRcdGxldCBzID0gSlNPTi5zdHJpbmdpZnkobGVybmEsIG51bGwsIDIpO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgcyk7XG5cblx0XHRjb25zb2xlLmluZm8oYHVwZGF0ZSBsZXJuYS5qc29uYCk7XG5cdH1cblx0ZWxzZSBpZiAoIWxlcm5hKVxuXHR7XG5cdFx0bGV0IGZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ2xlcm5hLmpzb24nKTtcblxuXHRcdGxlcm5hID0ge1xuXHRcdFx0XCJwYWNrYWdlc1wiOiBwYWNrYWdlcyxcblx0XHRcdFwiY29tbWFuZFwiOiB7XG5cdFx0XHRcdFwicHVibGlzaFwiOiB7XG5cdFx0XHRcdFx0XCJpZ25vcmVDaGFuZ2VzXCI6IFtcIm5vZGVfbW9kdWxlc1wiXSxcblx0XHRcdFx0XHRcIm1lc3NhZ2VcIjogXCJjaG9yZShyZWxlYXNlKTogcHVibGlzaFwiXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcIm5wbUNsaWVudFwiOiBcInlhcm5cIixcblx0XHRcdFwidXNlV29ya3NwYWNlc1wiOiB0cnVlLFxuXHRcdFx0XCJ2ZXJzaW9uXCI6IFwiaW5kZXBlbmRlbnRcIixcblx0XHR9O1xuXG5cdFx0bGV0IHMgPSBKU09OLnN0cmluZ2lmeShsZXJuYSwgbnVsbCwgMik7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhmaWxlLCBzKTtcblxuXHRcdGNvbnNvbGUuc3VjY2VzcyhgY3JlYXRlIGxlcm5hLmpzb25gKTtcblx0fVxuXG5cdGlmICghZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ3RzY29uZmlnLmpzb24nKSkpXG5cdHtcblx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbih0YXJnZXRQYXRoLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeShnZXREZWZhdWx0VHNjb25maWcoKSwgbnVsbCwgMikpO1xuXG5cdFx0Y29uc29sZS5zdWNjZXNzKGBjcmVhdGUgdHNjb25maWcuanNvbmApO1xuXHR9XG5cblx0Y29weVN0YXRpY0ZpbGVzKHtcblx0XHRjd2Q6IHRhcmdldFBhdGgsXG5cdH0pO1xuXG5cdGNyZWF0ZURpckJ5UGFja2FnZXModGFyZ2V0UGF0aCwgcGFja2FnZXMpO1xuXG5cdHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFRzY29uZmlnKClcbntcblx0cmV0dXJuIHtcblx0XHRleHRlbmRzOiBcIkBibHVlbG92ZXJzL3RzY29uZmlnL2VzbS9lc01vZHVsZUludGVyb3BcIlxuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0UGFja2FnZUpzb24obmFtZT86IHN0cmluZyk6IHtcblx0bmFtZTogc3RyaW5nO1xuXHR2ZXJzaW9uOiBzdHJpbmc7XG5cdHByaXZhdGU6IGJvb2xlYW47XG5cdHdvcmtzcGFjZXM6IHN0cmluZ1tdO1xuXHRzY3JpcHRzOiB7XG5cdFx0W2s6IHN0cmluZ106IHN0cmluZztcblx0XHR0ZXN0Pzogc3RyaW5nO1xuXHR9O1xuXHRyZXNvbHV0aW9uczoge1xuXHRcdFtrOiBzdHJpbmddOiBzdHJpbmc7XG5cdH07XG5cdFtrOiBzdHJpbmddOiBhbnk7XG59XG57XG5cdHJldHVybiB7XG5cdFx0XCJuYW1lXCI6IG5hbWUsXG5cdFx0XCJ2ZXJzaW9uXCI6IFwiMS4wLjBcIixcblx0XHRcInByaXZhdGVcIjogdHJ1ZSxcblx0XHRcIndvcmtzcGFjZXNcIjogW1xuXHRcdFx0XCJwYWNrYWdlcy8qXCJcblx0XHRdLFxuXHRcdFwic2NyaXB0c1wiOiB7XG5cdFx0XHRcImxlcm5hOnB1Ymxpc2hcIjogXCJucHggbGVybmEgcHVibGlzaFwiLFxuXHRcdFx0XCJsZXJuYTpwdWJsaXNoOnllc1wiOiBcIm5weCBsZXJuYSBwdWJsaXNoIC0teWVzIC0tY2QtdmVyc2lvbiBwYXRjaFwiLFxuXHRcdFx0XCJwcmVwdWJsaXNoOmxvY2tmaWxlXCI6IFwibnB4IHN5bmMtbG9ja2ZpbGUgLlwiLFxuXHRcdFx0XCJuY3VcIjogXCJucHggeWFybi10b29sIG5jdSAtdVwiLFxuXHRcdFx0XCJzb3J0LXBhY2thZ2UtanNvblwiOiBcIm5weCB5YXJuLXRvb2wgc29ydFwiLFxuXHRcdFx0XCJ0ZXN0XCI6IFwiZWNobyBcXFwiRXJyb3I6IG5vIHRlc3Qgc3BlY2lmaWVkXFxcIiAmJiBleGl0IDFcIlxuXHRcdH0sXG5cdFx0XCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuXHRcdFx0XCJAdHlwZXMvbm9kZVwiOiBcIipcIixcblx0XHRcdFwiQGJsdWVsb3ZlcnMvdHNjb25maWdcIjogXCJsYXRlc3RcIlxuXHRcdH0sXG5cdFx0XCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcdFwibGVybmFcIjogXCJeM1wiXG5cdFx0fSxcblx0XHRcInJlc29sdXRpb25zXCI6IHt9XG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXJCeVBhY2thZ2VzKGN3ZDogc3RyaW5nLCBwYWNrYWdlczogc3RyaW5nW10pXG57XG5cdHJldHVybiBwYWNrYWdlcy5zb21lKGZ1bmN0aW9uICh2YWx1ZSlcblx0e1xuXHRcdGxldCBib29sOiBib29sZWFuO1xuXG5cdFx0bGV0IHMgPSB2YWx1ZS5zcGxpdCgvW1xcL1xcXFxdLylbMF07XG5cblx0XHRpZiAoIS9bIT9cXCp7fVxcW1xcXV0vLnRlc3QocykpXG5cdFx0e1xuXHRcdFx0bGV0IGRpciA9IHBhdGguam9pbihjd2QsIHMpO1xuXG5cdFx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSlcblx0XHRcdHtcblx0XHRcdFx0ZnMubWtkaXJTeW5jKGRpcik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBib29sO1xuXHR9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVZYXJuV29ya3NwYWNlcztcbiJdfQ==