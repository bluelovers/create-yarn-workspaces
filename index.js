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
        extends: "@bluelovers/tsconfig/sourcemap/mapfile.json"
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
            "lerna:publish": "lerna publish",
            "lerna:publish:yes": "lerna publish --yes --cd-version patch",
            "ncu": "npx yarn-tool ncu -u",
            "sort-package-json": "npx sort-package-json ./package.json",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "devDependencies": {
            "@types/node": "*",
            "@bluelovers/tsconfig": "^1.0.13"
        },
        "peerDependencies": {
            "lerna": "^3.14.1"
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBRUgsbUVBQW9FO0FBQ3BFLDZCQUE4QjtBQUM5QixrQ0FBbUM7QUFDbkMsK0JBQWdDO0FBRWhDLCtDQUF3QztBQUN4Qyx3REFBaUY7QUFFcEUsUUFBQSxPQUFPLEdBQUcsSUFBSSx1QkFBUSxDQUFDLElBQUksRUFBRTtJQUN6QyxLQUFLLEVBQUUsSUFBSTtJQUNYLElBQUksRUFBRSxJQUFJO0NBQ1YsQ0FBQyxDQUFDO0FBY0gsU0FBZ0Isb0JBQW9CLENBQUMsR0FBWSxFQUFFLFVBQW9CLEVBQUU7SUFFeEUsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLElBQUksUUFBUSxFQUNqQztRQUNDLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztLQUNsQjtJQUVELElBQUksQ0FBQyxHQUFHLEVBQ1I7UUFDQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ3BCO0lBRUQsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFeEIsSUFBSSxJQUFJLEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVwQyxJQUFJLEVBQVUsQ0FBQztJQUVmLElBQ0E7UUFDQyxnREFBZ0Q7UUFDaEQsRUFBRSxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2pDO0lBQ0QsT0FBTyxDQUFDLEVBQ1I7UUFDQyxlQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRTFCLEVBQUUsR0FBRyxJQUFJLENBQUM7S0FDVjtJQUVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTNDLE9BQU8sQ0FBQyxL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RUFBRSw2Q0FBNkM7U0FDckQ7UUFDRCxpQkFBaUIsRUFBRTtZQUNsQixhQUFhLEVBQUUsR0FBRztZQUNsQixzQkFBc0IsRUFBRSxTQUFTO1NBQ2pDO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsT0FBTyxFQUFFLFNBQVM7U0FDbEI7UUFDRCxhQUFhLEVBQUUsRUFBRTtLQUNqQixDQUFDO0FBQ0gsQ0FBQztBQXRDRCxzREFzQ0M7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsUUFBa0I7SUFFbEUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSztRQUVuQyxJQUFJLElBQWEsQ0FBQztRQUVsQixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUMzQjtZQUNDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTVCLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUN2QjtnQkFDQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBdEJELGtEQXNCQztBQUVELGtCQUFlLG9CQUFvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGVkIGJ5IHVzZXIgb24gMjAxOC81LzEzLzAxMy5cbiAqL1xuXG5pbXBvcnQgZmluZFlhcm5Xb3Jrc3BhY2VSb290ID0gcmVxdWlyZSgnZmluZC15YXJuLXdvcmtzcGFjZS1yb290MicpO1xuaW1wb3J0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5pbXBvcnQgcGtnRGlyID0gcmVxdWlyZSgncGtnLWRpcicpO1xuaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcblxuaW1wb3J0IHsgQ29uc29sZTIgfSBmcm9tICdkZWJ1Zy1jb2xvcjInO1xuaW1wb3J0IGNvcHlTdGF0aWNGaWxlcywgeyBkZWZhdWx0Q29weVN0YXRpY0ZpbGVzIH0gZnJvbSAnQHlhcm4tdG9vbC9zdGF0aWMtZmlsZSc7XG5cbmV4cG9ydCBjb25zdCBjb25zb2xlID0gbmV3IENvbnNvbGUyKG51bGwsIHtcblx0bGFiZWw6IHRydWUsXG5cdHRpbWU6IHRydWUsXG59KTtcblxuZXhwb3J0IGludGVyZmFjZSBJT3B0aW9uc1xue1xuXHRjd2Q/OiBzdHJpbmcsXG5cblx0aWdub3JlUGFyZW50V29ya3NwYWNlcz86IGJvb2xlYW4sXG5cdGlnbm9yZUV4aXN0c1BhY2thZ2U/OiBib29sZWFuLFxuXG5cdGluaXRQYWNrYWdlSnNvbj88VCA9IGFueT4oY3VycmVudDogUmV0dXJuVHlwZTx0eXBlb2YgZ2V0RGVmYXVsdFBhY2thZ2VKc29uPik6IFJldHVyblR5cGU8dHlwZW9mIGdldERlZmF1bHRQYWNrYWdlSnNvbj4gfCBSZXR1cm5UeXBlPHR5cGVvZiBnZXREZWZhdWx0UGFja2FnZUpzb24+ICYgVCxcblxuXHRkZWJ1Zz86IGJvb2xlYW4sXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVZYXJuV29ya3NwYWNlcyhjd2Q/OiBzdHJpbmcsIG9wdGlvbnM6IElPcHRpb25zID0ge30pXG57XG5cdGlmIChjd2QgJiYgdHlwZW9mIGN3ZCAhPSAnc3RyaW5nJylcblx0e1xuXHRcdG9wdGlvbnMgPSBjd2Q7XG5cdFx0Y3dkID0gb3B0aW9ucy5jd2Q7XG5cdH1cblxuXHRpZiAoIWN3ZClcblx0e1xuXHRcdGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5cdH1cblxuXHRjd2QgPSBwYXRoLnJlc29sdmUoY3dkKTtcblxuXHRsZXQgcm9vdDogc3RyaW5nID0gcGtnRGlyLnN5bmMoY3dkKTtcblxuXHRsZXQgd3M6IHN0cmluZztcblxuXHR0cnlcblx0e1xuXHRcdC8vIEBGSVhNRSDkuIDlgIvlpYfmgKrnmoRCVUcg5LiN5L2/55SoIHRyeSDnmoToqbEg5ZyoIE5QWCDlupXkuIvlsLHmnIPlh7rnj77nhKHoqIrmga/nmoTlgZzmraJcblx0XHR3cyA9IGZpbmRZYXJuV29ya3NwYWNlUm9vdChyb290KTtcblx0fVxuXHRjYXRjaCAoZSlcblx0e1xuXHRcdGNvbnNvbGUubG9nKGUudG9TdHJpbmcoKSk7XG5cblx0XHR3cyA9IG51bGw7XG5cdH1cblxuXHRsZXQgdGFyZ2V0UGF0aCA9IHBhdGgucmVzb2x2ZShyb290IHx8IGN3ZCk7XG5cblx0b3B0aW9ucy5kZWJ1ZyAmJiBjb25zb2xlLmRlYnVnKHtcblx0XHR0YXJnZXRQYXRoLFxuXHRcdHdzLFxuXHRcdG9wdGlvbnMsXG5cdH0pO1xuXG5cdGlmICghb3B0aW9ucy5pZ25vcmVFeGlzdHNQYWNrYWdlICYmIHJvb3QpXG5cdHtcblx0XHRjb25zb2xlLmVycm9yKGBhbHJlYWR5IGhhdmUgcGFja2FnZSBhdCBcIiR7cm9vdH1cIiwgb3IgdXNlIGlnbm9yZUV4aXN0c1BhY2thZ2UgZm9yIG92ZXJ3cml0ZSBpdGApO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGVsc2UgaWYgKHJvb3QpXG5cdHtcblx0XHRjb25zb2xlLndhcm4oYGlnbm9yZSBleGlzdHMgcGFja2FnZSBcIiR7cm9vdH1cImApO1xuXHR9XG5cblx0aWYgKHdzKVxuXHR7XG5cdFx0bGV0IGJvb2w6IGJvb2xlYW4gPSB0cnVlO1xuXG5cdFx0Y29uc29sZS53YXJuKGBkZXRlY3QgZXhpc3RzIHdvcmtzcGFjZSBcIiR7d3N9XCJgKTtcblxuXHRcdGlmIChvcHRpb25zLmlnbm9yZVBhcmVudFdvcmtzcGFjZXMpXG5cdFx0e1xuXHRcdFx0Ym9vbCA9IGlzU2FtZVBhdGgodGFyZ2V0UGF0aCwgd3MpO1xuXG5cdFx0XHRpZiAoIWJvb2wpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUud2FybihgaWdub3JlUGFyZW50V29ya3NwYWNlcyA9IHRydWVgKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgdGFyZ2V0IHBhdGggYWxyZWFkeSBpcyB3b3Jrc3BhY2VgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYm9vbClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIF9jcmVhdGVZYXJuV29ya3NwYWNlcyh0YXJnZXRQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZVBhdGgocDE6IHN0cmluZywgcDI6IHN0cmluZylcbntcblx0aWYgKHAxID09PSBwMilcblx0e1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdGVsc2UgaWYgKCFwMSB8fCAhcDIpXG5cdHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRsZXQgcyA9IHBhdGgucmVsYXRpdmUocDEsIHAyKTtcblx0cmV0dXJuIChzID09PSAnLicgfHwgcyA9PT0gJycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX2NyZWF0ZVlhcm5Xb3Jrc3BhY2VzKHRhcmdldFBhdGg6IHN0cmluZywgb3B0aW9uczogSU9wdGlvbnMgPSB7fSlcbntcblx0Y29uc29sZS5pbmZvKGBjcmVhdGUgaW4gdGFyZ2V0IHBhdGggXCIke3RhcmdldFBhdGh9XCJgKTtcblxuXHRsZXQgcGtnOiBSZXR1cm5UeXBlPHR5cGVvZiBnZXREZWZhdWx0UGFja2FnZUpzb24+O1xuXG5cdGxldCBsZXJuYTtcblxuXHR7XG5cdFx0bGV0IGZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ2xlcm5hLmpzb24nKTtcblxuXHRcdGlmIChmcy5leGlzdHNTeW5jKGZpbGUpKVxuXHRcdHtcblx0XHRcdGxldCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZSkudG9TdHJpbmcoKSk7XG5cblx0XHRcdGlmIChqc29uLnBhY2thZ2VzICYmICFPYmplY3Qua2V5cyhqc29uLnBhY2thZ2VzKS5sZW5ndGgpXG5cdFx0XHR7XG5cdFx0XHRcdGpzb24ucGFja2FnZXMgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cblx0XHRcdGxlcm5hID0ganNvbjtcblx0XHR9XG5cdH1cblxuXHRsZXQgcGFja2FnZXMgPSBsZXJuYSAmJiBsZXJuYS5wYWNrYWdlcyB8fCBbXG5cdFx0XCJwYWNrYWdlcy8qXCIsXG5cdF07XG5cblx0bGV0IGZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuXG5cdGlmICghZnMuZXhpc3RzU3luYyhmaWxlKSlcblx0e1xuXHRcdGxldCBuYW1lID0gcGF0aC5iYXNlbmFtZSh0YXJnZXRQYXRoKTtcblxuXHRcdGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXRQYXRoKSlcblx0XHR7XG5cdFx0XHRmcy5ta2RpclN5bmModGFyZ2V0UGF0aCk7XG5cdFx0fVxuXG5cdFx0cGtnID0gT2JqZWN0LmFzc2lnbihnZXREZWZhdWx0UGFja2FnZUpzb24obmFtZSksIHtcblx0XHRcdG5hbWUsXG5cdFx0XHR3b3Jrc3BhY2VzOiBwYWNrYWdlcyxcblx0XHR9KTtcblxuXHRcdGlmIChvcHRpb25zLmluaXRQYWNrYWdlSnNvbilcblx0XHR7XG5cdFx0XHRsZXQgcmV0ID0gb3B0aW9ucy5pbml0UGFja2FnZUpzb24ocGtnKTtcblxuXHRcdFx0aWYgKHJldClcblx0XHRcdHtcblx0XHRcdFx0cGtnID0gcmV0O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRlbHNlXG5cdHtcblx0XHRsZXQganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUpLnRvU3RyaW5nKCkpO1xuXG5cdFx0bGV0IHdvcmtzcGFjZXM7XG5cblx0XHRpZiAoanNvbi53b3Jrc3BhY2VzICYmIE9iamVjdC5rZXlzKGpzb24ud29ya3NwYWNlcykubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHdvcmtzcGFjZXMgPSBqc29uLndvcmtzcGFjZXM7XG5cblx0XHRcdC8vIGh0dHBzOi8veWFybnBrZy5jb20vYmxvZy8yMDE4LzAyLzE1L25vaG9pc3QvXG5cdFx0XHRwYWNrYWdlcyA9IHdvcmtzcGFjZXMucGFja2FnZXMgfHwgd29ya3NwYWNlcztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHdvcmtzcGFjZXMgPSBwYWNrYWdlcztcblx0XHR9XG5cblx0XHRwa2cgPSBPYmplY3QuYXNzaWduKGpzb24sIHtcblx0XHRcdFwicHJpdmF0ZVwiOiB0cnVlLFxuXHRcdFx0XCJ3b3Jrc3BhY2VzXCI6IHdvcmtzcGFjZXMsXG5cdFx0fSk7XG5cblx0XHRwa2cucmVzb2x1dGlvbnMgPSBwa2cucmVzb2x1dGlvbnMgfHwge307XG5cdH1cblxuXHRsZXQgcyA9IEpTT04uc3RyaW5naWZ5KHBrZywgbnVsbCwgMik7XG5cdGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgcyk7XG5cblx0Y29uc29sZS5zdWNjZXNzKGBjcmVhdGUgd29ya3NwYWNlIHBhY2thZ2UuanNvbmApO1xuXG5cdGlmIChsZXJuYSAmJiAocGFja2FnZXMgIT0gbGVybmEucGFja2FnZXMgfHwgbGVybmEubnBtQ2xpZW50ICE9PSAneWFybicgfHwgbGVybmEudXNlV29ya3NwYWNlcyAhPT0gdHJ1ZSkpXG5cdHtcblx0XHRsZXQgZmlsZSA9IHBhdGguam9pbih0YXJnZXRQYXRoLCAnbGVybmEuanNvbicpO1xuXG5cdFx0bGVybmEucGFja2FnZXMgPSBwYWNrYWdlcztcblx0XHRsZXJuYS5ucG1DbGllbnQgPSAneWFybic7XG5cdFx0bGVybmEudXNlV29ya3NwYWNlcyA9IHRydWU7XG5cblx0XHRsZXQgcyA9IEpTT04uc3RyaW5naWZ5KGxlcm5hLCBudWxsLCAyKTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKGZpbGUsIHMpO1xuXG5cdFx0Y29uc29sZS5pbmZvKGB1cGRhdGUgbGVybmEuanNvbmApO1xuXHR9XG5cdGVsc2UgaWYgKCFsZXJuYSlcblx0e1xuXHRcdGxldCBmaWxlID0gcGF0aC5qb2luKHRhcmdldFBhdGgsICdsZXJuYS5qc29uJyk7XG5cblx0XHRsZXJuYSA9IHtcblx0XHRcdFwicGFja2FnZXNcIjogcGFja2FnZXMsXG5cdFx0XHRcImNvbW1hbmRcIjoge1xuXHRcdFx0XHRcInB1Ymxpc2hcIjoge1xuXHRcdFx0XHRcdFwiaWdub3JlQ2hhbmdlc1wiOiBbXCJub2RlX21vZHVsZXNcIl0sXG5cdFx0XHRcdFx0XCJtZXNzYWdlXCI6IFwiY2hvcmUocmVsZWFzZSk6IHB1Ymxpc2hcIlxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJucG1DbGllbnRcIjogXCJ5YXJuXCIsXG5cdFx0XHRcInVzZVdvcmtzcGFjZXNcIjogdHJ1ZSxcblx0XHRcdFwidmVyc2lvblwiOiBcImluZGVwZW5kZW50XCIsXG5cdFx0fTtcblxuXHRcdGxldCBzID0gSlNPTi5zdHJpbmdpZnkobGVybmEsIG51bGwsIDIpO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgcyk7XG5cblx0XHRjb25zb2xlLnN1Y2Nlc3MoYGNyZWF0ZSBsZXJuYS5qc29uYCk7XG5cdH1cblxuXHRpZiAoIWZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHRhcmdldFBhdGgsICd0c2NvbmZpZy5qc29uJykpKVxuXHR7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoZ2V0RGVmYXVsdFRzY29uZmlnKCksIG51bGwsIDIpKTtcblxuXHRcdGNvbnNvbGUuc3VjY2VzcyhgY3JlYXRlIHRzY29uZmlnLmpzb25gKTtcblx0fVxuXG5cdGNvcHlTdGF0aWNGaWxlcyh7XG5cdFx0Y3dkOiB0YXJnZXRQYXRoLFxuXHR9KTtcblxuXHRjcmVhdGVEaXJCeVBhY2thZ2VzKHRhcmdldFBhdGgsIHBhY2thZ2VzKTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRUc2NvbmZpZygpXG57XG5cdHJldHVybiB7XG5cdFx0ZXh0ZW5kczogXCJAYmx1ZWxvdmVycy90c2NvbmZpZy9zb3VyY2VtYXAvbWFwZmlsZS5qc29uXCJcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFBhY2thZ2VKc29uKG5hbWU/OiBzdHJpbmcpOiB7XG5cdG5hbWU6IHN0cmluZztcblx0dmVyc2lvbjogc3RyaW5nO1xuXHRwcml2YXRlOiBib29sZWFuO1xuXHR3b3Jrc3BhY2VzOiBzdHJpbmdbXTtcblx0c2NyaXB0czoge1xuXHRcdFtrOiBzdHJpbmddOiBzdHJpbmc7XG5cdFx0dGVzdD86IHN0cmluZztcblx0fTtcblx0cmVzb2x1dGlvbnM6IHtcblx0XHRbazogc3RyaW5nXTogc3RyaW5nO1xuXHR9O1xuXHRbazogc3RyaW5nXTogYW55O1xufVxue1xuXHRyZXR1cm4ge1xuXHRcdFwibmFtZVwiOiBuYW1lLFxuXHRcdFwidmVyc2lvblwiOiBcIjEuMC4wXCIsXG5cdFx0XCJwcml2YXRlXCI6IHRydWUsXG5cdFx0XCJ3b3Jrc3BhY2VzXCI6IFtcblx0XHRcdFwicGFja2FnZXMvKlwiXG5cdFx0XSxcblx0XHRcInNjcmlwdHNcIjoge1xuXHRcdFx0XCJsZXJuYTpwdWJsaXNoXCI6IFwibGVybmEgcHVibGlzaFwiLFxuXHRcdFx0XCJsZXJuYTpwdWJsaXNoOnllc1wiOiBcImxlcm5hIHB1Ymxpc2ggLS15ZXMgLS1jZC12ZXJzaW9uIHBhdGNoXCIsXG5cdFx0XHRcIm5jdVwiOiBcIm5weCB5YXJuLXRvb2wgbmN1IC11XCIsXG5cdFx0XHRcInNvcnQtcGFja2FnZS1qc29uXCI6IFwibnB4IHNvcnQtcGFja2FnZS1qc29uIC4vcGFja2FnZS5qc29uXCIsXG5cdFx0XHRcInRlc3RcIjogXCJlY2hvIFxcXCJFcnJvcjogbm8gdGVzdCBzcGVjaWZpZWRcXFwiICYmIGV4aXQgMVwiXG5cdFx0fSxcblx0XHRcImRldkRlcGVuZGVuY2llc1wiOiB7XG5cdFx0XHRcIkB0eXBlcy9ub2RlXCI6IFwiKlwiLFxuXHRcdFx0XCJAYmx1ZWxvdmVycy90c2NvbmZpZ1wiOiBcIl4xLjAuMTNcIlxuXHRcdH0sXG5cdFx0XCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcdFwibGVybmFcIjogXCJeMy4xNC4xXCJcblx0XHR9LFxuXHRcdFwicmVzb2x1dGlvbnNcIjoge31cblx0fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpckJ5UGFja2FnZXMoY3dkOiBzdHJpbmcsIHBhY2thZ2VzOiBzdHJpbmdbXSlcbntcblx0cmV0dXJuIHBhY2thZ2VzLnNvbWUoZnVuY3Rpb24gKHZhbHVlKVxuXHR7XG5cdFx0bGV0IGJvb2w6IGJvb2xlYW47XG5cblx0XHRsZXQgcyA9IHZhbHVlLnNwbGl0KC9bXFwvXFxcXF0vKVswXTtcblxuXHRcdGlmICghL1shP1xcKnt9XFxbXFxdXS8udGVzdChzKSlcblx0XHR7XG5cdFx0XHRsZXQgZGlyID0gcGF0aC5qb2luKGN3ZCwgcyk7XG5cblx0XHRcdGlmICghZnMuZXhpc3RzU3luYyhkaXIpKVxuXHRcdFx0e1xuXHRcdFx0XHRmcy5ta2RpclN5bmMoZGlyKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJvb2w7XG5cdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZVlhcm5Xb3Jrc3BhY2VzO1xuIl19