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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBRUgsbUVBQW9FO0FBQ3BFLDZCQUE4QjtBQUM5QixrQ0FBbUM7QUFDbkMsK0JBQWdDO0FBRWhDLCtDQUF3QztBQUN4Qyx3REFBaUY7QUFFcEUsUUFBQSxPQUFPLEdBQUcsSUFBSSx1QkFBUSxDQUFDLElBQUksRUFBRTtJQUN6QyxLQUFLLEVBQUUsSUFBSTtJQUNYLElBQUksRUFBRSxJQUFJO0NBQ1YsQ0FBQyxDQUFDO0FBY0gsU0FBZ0Isb0JBQW9CLENBQUMsR0FBWSxFQUFFLFVBQW9CLEVBQUU7SUFFeEUsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLElBQUksUUFBUSxFQUNqQztRQUNDLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztLQUNsQjtJQUVELElBQUksQ0FBQyxHQUFHLEVBQ1I7UUFDQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0tBQ3BCO0lBRUQsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFeEIsSUFBSSxJQUFJLEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVwQyxJQUFJLEVBQVUsQ0FBQztJQUVmLElBQ0E7UUFDQyxnREFBZ0Q7UUFDaEQsRUFBRSxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2pDO0lBQ0QsT0FBTyxDQUFDLEVBQ1I7UUFDQyxlQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRTFCLEVBQUUsR0FBRyxJQUFJLENBQUM7S0FDVjtJQUVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTNDLE9BQU8sQ0FBQyxL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QUFFO1lBQ25CLE9BQU8sRUFBRSxTQUFTO1NBQ2xCO1FBQ0QsYUFBYSxFQUFFLEVBQUU7S0FDakIsQ0FBQztBQUNILENBQUM7QUF0Q0Qsc0RBc0NDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsR0FBVyxFQUFFLFFBQWtCO0lBRWxFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEtBQUs7UUFFbkMsSUFBSSxJQUFhLENBQUM7UUFFbEIsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDM0I7WUFDQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU1QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFDdkI7Z0JBQ0MsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDO1NBQ1o7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQXRCRCxrREFzQkM7QUFFRCxrQkFBZSxvQkFBb0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSB1c2VyIG9uIDIwMTgvNS8xMy8wMTMuXG4gKi9cblxuaW1wb3J0IGZpbmRZYXJuV29ya3NwYWNlUm9vdCA9IHJlcXVpcmUoJ2ZpbmQteWFybi13b3Jrc3BhY2Utcm9vdDInKTtcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuaW1wb3J0IHBrZ0RpciA9IHJlcXVpcmUoJ3BrZy1kaXInKTtcbmltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG5cbmltcG9ydCB7IENvbnNvbGUyIH0gZnJvbSAnZGVidWctY29sb3IyJztcbmltcG9ydCBjb3B5U3RhdGljRmlsZXMsIHsgZGVmYXVsdENvcHlTdGF0aWNGaWxlcyB9IGZyb20gJ0B5YXJuLXRvb2wvc3RhdGljLWZpbGUnO1xuXG5leHBvcnQgY29uc3QgY29uc29sZSA9IG5ldyBDb25zb2xlMihudWxsLCB7XG5cdGxhYmVsOiB0cnVlLFxuXHR0aW1lOiB0cnVlLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU9wdGlvbnNcbntcblx0Y3dkPzogc3RyaW5nLFxuXG5cdGlnbm9yZVBhcmVudFdvcmtzcGFjZXM/OiBib29sZWFuLFxuXHRpZ25vcmVFeGlzdHNQYWNrYWdlPzogYm9vbGVhbixcblxuXHRpbml0UGFja2FnZUpzb24/PFQgPSBhbnk+KGN1cnJlbnQ6IFJldHVyblR5cGU8dHlwZW9mIGdldERlZmF1bHRQYWNrYWdlSnNvbj4pOiBSZXR1cm5UeXBlPHR5cGVvZiBnZXREZWZhdWx0UGFja2FnZUpzb24+IHwgUmV0dXJuVHlwZTx0eXBlb2YgZ2V0RGVmYXVsdFBhY2thZ2VKc29uPiAmIFQsXG5cblx0ZGVidWc/OiBib29sZWFuLFxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlWWFybldvcmtzcGFjZXMoY3dkPzogc3RyaW5nLCBvcHRpb25zOiBJT3B0aW9ucyA9IHt9KVxue1xuXHRpZiAoY3dkICYmIHR5cGVvZiBjd2QgIT0gJ3N0cmluZycpXG5cdHtcblx0XHRvcHRpb25zID0gY3dkO1xuXHRcdGN3ZCA9IG9wdGlvbnMuY3dkO1xuXHR9XG5cblx0aWYgKCFjd2QpXG5cdHtcblx0XHRjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXHR9XG5cblx0Y3dkID0gcGF0aC5yZXNvbHZlKGN3ZCk7XG5cblx0bGV0IHJvb3Q6IHN0cmluZyA9IHBrZ0Rpci5zeW5jKGN3ZCk7XG5cblx0bGV0IHdzOiBzdHJpbmc7XG5cblx0dHJ5XG5cdHtcblx0XHQvLyBARklYTUUg5LiA5YCL5aWH5oCq55qEQlVHIOS4jeS9v+eUqCB0cnkg55qE6KmxIOWcqCBOUFgg5bqV5LiL5bCx5pyD5Ye654++54Sh6KiK5oGv55qE5YGc5q2iXG5cdFx0d3MgPSBmaW5kWWFybldvcmtzcGFjZVJvb3Qocm9vdCk7XG5cdH1cblx0Y2F0Y2ggKGUpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhlLnRvU3RyaW5nKCkpO1xuXG5cdFx0d3MgPSBudWxsO1xuXHR9XG5cblx0bGV0IHRhcmdldFBhdGggPSBwYXRoLnJlc29sdmUocm9vdCB8fCBjd2QpO1xuXG5cdG9wdGlvbnMuZGVidWcgJiYgY29uc29sZS5kZWJ1Zyh7XG5cdFx0dGFyZ2V0UGF0aCxcblx0XHR3cyxcblx0XHRvcHRpb25zLFxuXHR9KTtcblxuXHRpZiAoIW9wdGlvbnMuaWdub3JlRXhpc3RzUGFja2FnZSAmJiByb290KVxuXHR7XG5cdFx0Y29uc29sZS5lcnJvcihgYWxyZWFkeSBoYXZlIHBhY2thZ2UgYXQgXCIke3Jvb3R9XCIsIG9yIHVzZSBpZ25vcmVFeGlzdHNQYWNrYWdlIGZvciBvdmVyd3JpdGUgaXRgKTtcblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRlbHNlIGlmIChyb290KVxuXHR7XG5cdFx0Y29uc29sZS53YXJuKGBpZ25vcmUgZXhpc3RzIHBhY2thZ2UgXCIke3Jvb3R9XCJgKTtcblx0fVxuXG5cdGlmICh3cylcblx0e1xuXHRcdGxldCBib29sOiBib29sZWFuID0gdHJ1ZTtcblxuXHRcdGNvbnNvbGUud2FybihgZGV0ZWN0IGV4aXN0cyB3b3Jrc3BhY2UgXCIke3dzfVwiYCk7XG5cblx0XHRpZiAob3B0aW9ucy5pZ25vcmVQYXJlbnRXb3Jrc3BhY2VzKVxuXHRcdHtcblx0XHRcdGJvb2wgPSBpc1NhbWVQYXRoKHRhcmdldFBhdGgsIHdzKTtcblxuXHRcdFx0aWYgKCFib29sKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYGlnbm9yZVBhcmVudFdvcmtzcGFjZXMgPSB0cnVlYCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYHRhcmdldCBwYXRoIGFscmVhZHkgaXMgd29ya3NwYWNlYCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGJvb2wpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBfY3JlYXRlWWFybldvcmtzcGFjZXModGFyZ2V0UGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NhbWVQYXRoKHAxOiBzdHJpbmcsIHAyOiBzdHJpbmcpXG57XG5cdGlmIChwMSA9PT0gcDIpXG5cdHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRlbHNlIGlmICghcDEgfHwgIXAyKVxuXHR7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0bGV0IHMgPSBwYXRoLnJlbGF0aXZlKHAxLCBwMik7XG5cdHJldHVybiAocyA9PT0gJy4nIHx8IHMgPT09ICcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9jcmVhdGVZYXJuV29ya3NwYWNlcyh0YXJnZXRQYXRoOiBzdHJpbmcsIG9wdGlvbnM6IElPcHRpb25zID0ge30pXG57XG5cdGNvbnNvbGUuaW5mbyhgY3JlYXRlIGluIHRhcmdldCBwYXRoIFwiJHt0YXJnZXRQYXRofVwiYCk7XG5cblx0bGV0IHBrZzogUmV0dXJuVHlwZTx0eXBlb2YgZ2V0RGVmYXVsdFBhY2thZ2VKc29uPjtcblxuXHRsZXQgbGVybmE7XG5cblx0e1xuXHRcdGxldCBmaWxlID0gcGF0aC5qb2luKHRhcmdldFBhdGgsICdsZXJuYS5qc29uJyk7XG5cblx0XHRpZiAoZnMuZXhpc3RzU3luYyhmaWxlKSlcblx0XHR7XG5cdFx0XHRsZXQganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUpLnRvU3RyaW5nKCkpO1xuXG5cdFx0XHRpZiAoanNvbi5wYWNrYWdlcyAmJiAhT2JqZWN0LmtleXMoanNvbi5wYWNrYWdlcykubGVuZ3RoKVxuXHRcdFx0e1xuXHRcdFx0XHRqc29uLnBhY2thZ2VzID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXJuYSA9IGpzb247XG5cdFx0fVxuXHR9XG5cblx0bGV0IHBhY2thZ2VzID0gbGVybmEgJiYgbGVybmEucGFja2FnZXMgfHwgW1xuXHRcdFwicGFja2FnZXMvKlwiLFxuXHRdO1xuXG5cdGxldCBmaWxlID0gcGF0aC5qb2luKHRhcmdldFBhdGgsICdwYWNrYWdlLmpzb24nKTtcblxuXHRpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZSkpXG5cdHtcblx0XHRsZXQgbmFtZSA9IHBhdGguYmFzZW5hbWUodGFyZ2V0UGF0aCk7XG5cblx0XHRpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0UGF0aCkpXG5cdFx0e1xuXHRcdFx0ZnMubWtkaXJTeW5jKHRhcmdldFBhdGgpO1xuXHRcdH1cblxuXHRcdHBrZyA9IE9iamVjdC5hc3NpZ24oZ2V0RGVmYXVsdFBhY2thZ2VKc29uKG5hbWUpLCB7XG5cdFx0XHRuYW1lLFxuXHRcdFx0d29ya3NwYWNlczogcGFja2FnZXMsXG5cdFx0fSk7XG5cblx0XHRpZiAob3B0aW9ucy5pbml0UGFja2FnZUpzb24pXG5cdFx0e1xuXHRcdFx0bGV0IHJldCA9IG9wdGlvbnMuaW5pdFBhY2thZ2VKc29uKHBrZyk7XG5cblx0XHRcdGlmIChyZXQpXG5cdFx0XHR7XG5cdFx0XHRcdHBrZyA9IHJldDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZWxzZVxuXHR7XG5cdFx0bGV0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlKS50b1N0cmluZygpKTtcblxuXHRcdGxldCB3b3Jrc3BhY2VzO1xuXG5cdFx0aWYgKGpzb24ud29ya3NwYWNlcyAmJiBPYmplY3Qua2V5cyhqc29uLndvcmtzcGFjZXMpLmxlbmd0aClcblx0XHR7XG5cdFx0XHR3b3Jrc3BhY2VzID0ganNvbi53b3Jrc3BhY2VzO1xuXG5cdFx0XHQvLyBodHRwczovL3lhcm5wa2cuY29tL2Jsb2cvMjAxOC8wMi8xNS9ub2hvaXN0L1xuXHRcdFx0cGFja2FnZXMgPSB3b3Jrc3BhY2VzLnBhY2thZ2VzIHx8IHdvcmtzcGFjZXM7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR3b3Jrc3BhY2VzID0gcGFja2FnZXM7XG5cdFx0fVxuXG5cdFx0cGtnID0gT2JqZWN0LmFzc2lnbihqc29uLCB7XG5cdFx0XHRcInByaXZhdGVcIjogdHJ1ZSxcblx0XHRcdFwid29ya3NwYWNlc1wiOiB3b3Jrc3BhY2VzLFxuXHRcdH0pO1xuXG5cdFx0cGtnLnJlc29sdXRpb25zID0gcGtnLnJlc29sdXRpb25zIHx8IHt9O1xuXHR9XG5cblx0bGV0IHMgPSBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpO1xuXHRmcy53cml0ZUZpbGVTeW5jKGZpbGUsIHMpO1xuXG5cdGNvbnNvbGUuc3VjY2VzcyhgY3JlYXRlIHdvcmtzcGFjZSBwYWNrYWdlLmpzb25gKTtcblxuXHRpZiAobGVybmEgJiYgKHBhY2thZ2VzICE9IGxlcm5hLnBhY2thZ2VzIHx8IGxlcm5hLm5wbUNsaWVudCAhPT0gJ3lhcm4nIHx8IGxlcm5hLnVzZVdvcmtzcGFjZXMgIT09IHRydWUpKVxuXHR7XG5cdFx0bGV0IGZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ2xlcm5hLmpzb24nKTtcblxuXHRcdGxlcm5hLnBhY2thZ2VzID0gcGFja2FnZXM7XG5cdFx0bGVybmEubnBtQ2xpZW50ID0gJ3lhcm4nO1xuXHRcdGxlcm5hLnVzZVdvcmtzcGFjZXMgPSB0cnVlO1xuXG5cdFx0bGV0IHMgPSBKU09OLnN0cmluZ2lmeShsZXJuYSwgbnVsbCwgMik7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhmaWxlLCBzKTtcblxuXHRcdGNvbnNvbGUuaW5mbyhgdXBkYXRlIGxlcm5hLmpzb25gKTtcblx0fVxuXHRlbHNlIGlmICghbGVybmEpXG5cdHtcblx0XHRsZXQgZmlsZSA9IHBhdGguam9pbih0YXJnZXRQYXRoLCAnbGVybmEuanNvbicpO1xuXG5cdFx0bGVybmEgPSB7XG5cdFx0XHRcInBhY2thZ2VzXCI6IHBhY2thZ2VzLFxuXHRcdFx0XCJucG1DbGllbnRcIjogXCJ5YXJuXCIsXG5cdFx0XHRcInVzZVdvcmtzcGFjZXNcIjogdHJ1ZSxcblx0XHRcdFwidmVyc2lvblwiOiBcImluZGVwZW5kZW50XCIsXG5cdFx0fTtcblxuXHRcdGxldCBzID0gSlNPTi5zdHJpbmdpZnkobGVybmEsIG51bGwsIDIpO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgcyk7XG5cblx0XHRjb25zb2xlLnN1Y2Nlc3MoYGNyZWF0ZSBsZXJuYS5qc29uYCk7XG5cdH1cblxuXHRpZiAoIWZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHRhcmdldFBhdGgsICd0c2NvbmZpZy5qc29uJykpKVxuXHR7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4odGFyZ2V0UGF0aCwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoZ2V0RGVmYXVsdFRzY29uZmlnKCksIG51bGwsIDIpKTtcblxuXHRcdGNvbnNvbGUuc3VjY2VzcyhgY3JlYXRlIHRzY29uZmlnLmpzb25gKTtcblx0fVxuXG5cdGNvcHlTdGF0aWNGaWxlcyh7XG5cdFx0Y3dkOiB0YXJnZXRQYXRoLFxuXHR9KTtcblxuXHRjcmVhdGVEaXJCeVBhY2thZ2VzKHRhcmdldFBhdGgsIHBhY2thZ2VzKTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRUc2NvbmZpZygpXG57XG5cdHJldHVybiB7XG5cdFx0ZXh0ZW5kczogXCJAYmx1ZWxvdmVycy90c2NvbmZpZy9zb3VyY2VtYXAvbWFwZmlsZS5qc29uXCJcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFBhY2thZ2VKc29uKG5hbWU/OiBzdHJpbmcpOiB7XG5cdG5hbWU6IHN0cmluZztcblx0dmVyc2lvbjogc3RyaW5nO1xuXHRwcml2YXRlOiBib29sZWFuO1xuXHR3b3Jrc3BhY2VzOiBzdHJpbmdbXTtcblx0c2NyaXB0czoge1xuXHRcdFtrOiBzdHJpbmddOiBzdHJpbmc7XG5cdFx0dGVzdD86IHN0cmluZztcblx0fTtcblx0cmVzb2x1dGlvbnM6IHtcblx0XHRbazogc3RyaW5nXTogc3RyaW5nO1xuXHR9O1xuXHRbazogc3RyaW5nXTogYW55O1xufVxue1xuXHRyZXR1cm4ge1xuXHRcdFwibmFtZVwiOiBuYW1lLFxuXHRcdFwidmVyc2lvblwiOiBcIjEuMC4wXCIsXG5cdFx0XCJwcml2YXRlXCI6IHRydWUsXG5cdFx0XCJ3b3Jrc3BhY2VzXCI6IFtcblx0XHRcdFwicGFja2FnZXMvKlwiXG5cdFx0XSxcblx0XHRcInNjcmlwdHNcIjoge1xuXHRcdFx0XCJsZXJuYTpwdWJsaXNoXCI6IFwibGVybmEgcHVibGlzaFwiLFxuXHRcdFx0XCJsZXJuYTpwdWJsaXNoOnllc1wiOiBcImxlcm5hIHB1Ymxpc2ggLS15ZXMgLS1jZC12ZXJzaW9uIHBhdGNoXCIsXG5cdFx0XHRcIm5jdVwiOiBcIm5weCB5YXJuLXRvb2wgbmN1IC11XCIsXG5cdFx0XHRcInNvcnQtcGFja2FnZS1qc29uXCI6IFwibnB4IHNvcnQtcGFja2FnZS1qc29uIC4vcGFja2FnZS5qc29uXCIsXG5cdFx0XHRcInRlc3RcIjogXCJlY2hvIFxcXCJFcnJvcjogbm8gdGVzdCBzcGVjaWZpZWRcXFwiICYmIGV4aXQgMVwiXG5cdFx0fSxcblx0XHRcImRldkRlcGVuZGVuY2llc1wiOiB7XG5cdFx0XHRcIkB0eXBlcy9ub2RlXCI6IFwiKlwiLFxuXHRcdFx0XCJAYmx1ZWxvdmVycy90c2NvbmZpZ1wiOiBcIl4xLjAuMTNcIlxuXHRcdH0sXG5cdFx0XCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcdFwibGVybmFcIjogXCJeMy4xNC4xXCJcblx0XHR9LFxuXHRcdFwicmVzb2x1dGlvbnNcIjoge31cblx0fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpckJ5UGFja2FnZXMoY3dkOiBzdHJpbmcsIHBhY2thZ2VzOiBzdHJpbmdbXSlcbntcblx0cmV0dXJuIHBhY2thZ2VzLnNvbWUoZnVuY3Rpb24gKHZhbHVlKVxuXHR7XG5cdFx0bGV0IGJvb2w6IGJvb2xlYW47XG5cblx0XHRsZXQgcyA9IHZhbHVlLnNwbGl0KC9bXFwvXFxcXF0vKVswXTtcblxuXHRcdGlmICghL1shP1xcKnt9XFxbXFxdXS8udGVzdChzKSlcblx0XHR7XG5cdFx0XHRsZXQgZGlyID0gcGF0aC5qb2luKGN3ZCwgcyk7XG5cblx0XHRcdGlmICghZnMuZXhpc3RzU3luYyhkaXIpKVxuXHRcdFx0e1xuXHRcdFx0XHRmcy5ta2RpclN5bmMoZGlyKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJvb2w7XG5cdH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZVlhcm5Xb3Jrc3BhY2VzO1xuIl19