/**
 * Created by user on 2018/5/13/013.
 */

import checkPkgWorkspace from 'check-pkg-workspace';
import * as findYarnWorkspaceRoot from 'find-yarn-workspace-root';
import * as path from 'path';
import * as pkgDir from 'pkg-dir';
import * as fs from 'fs';

export interface IOptions
{
	cwd?: string,

	ignoreParentWorkspaces?: boolean,
	ignoreExistsPackage?: boolean,
}

export function createYarnWorkspaces(cwd?: string, options: IOptions = {})
{
	if (cwd && typeof cwd != 'string')
	{
		options = cwd;
		cwd = options.cwd;
	}

	if (!cwd)
	{
		cwd = process.cwd();
	}

	cwd = path.resolve(cwd);

	let root: string = pkgDir.sync(cwd);
	let ws: string = findYarnWorkspaceRoot(root);

	let targetPath = path.resolve(root || cwd);

	if (!options.ignoreExistsPackage && root)
	{
		return false;
	}

	if (ws)
	{
		let bool: boolean = true;

		console.warn(`already have workspace at "${ws}"`);

		if (options.ignoreParentWorkspaces)
		{
			bool = isSamePath(targetPath, ws);

			if (!bool)
			{
				console.warn(`ignoreParentWorkspaces = true`);
			}
		}

		if (bool)
		{
			return false;
		}
	}

	return _createYarnWorkspaces(targetPath);
}

export function isSamePath(p1: string, p2: string)
{
	if (p1 === p2)
	{
		return true;
	}
	else if (!p1 || !p2)
	{
		return false;
	}

	let s = path.relative(p1, p2);
	return (s === '.' || s === '');
}

export function _createYarnWorkspaces(targetPath: string)
{
	console.log(`will create at ${targetPath}`);

	let file = path.join(targetPath, 'package.json');

	let pkg;

	let lerna;

	{
		let file = path.join(targetPath, 'lerna.json');

		if (fs.existsSync(file))
		{
			let json = JSON.parse(fs.readFileSync(file).toString());

			if (json.packages && !json.packages.length)
			{
				json.packages = undefined;
			}

			lerna = json;
		}
	}

	let packages = lerna && lerna.packages || [
		"packages/*",
	];

	if (!fs.existsSync(file))
	{
		let name = path.basename(targetPath);

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
	else
	{
		let json = JSON.parse(fs.readFileSync(file).toString());

		if (json.packages && json.packages.length)
		{
			packages = json.packages;
		}

		pkg = Object.assign(json, {
			"private": true,
			"workspaces": packages,
		});

		pkg.resolutions = pkg.resolutions || {};
	}

	let s = JSON.stringify(pkg, null, 2);
	fs.writeFileSync(file, s);

	console.log(`make workspace package.json`);

	if (lerna && (packages != lerna.packages || lerna.npmClient !== 'yarn' || lerna.useWorkspaces !== true))
	{
		let file = path.join(targetPath, 'lerna.json');

		lerna.packages = packages;
		lerna.npmClient = 'yarn';
		lerna.useWorkspaces = true;

		let s = JSON.stringify(lerna, null, 2);
		fs.writeFileSync(file, s);

		console.log(`update lerna.json`);
	}

	createDirByPackages(targetPath, packages);

	return true;
}

export function createDirByPackages(cwd: string, packages: string[])
{
	return packages.some(function (value)
	{
		let bool: boolean;

		let s = value.split(/[\/\\]/)[0];

		if (!/[!?\*{}\[\]]/.test(s))
		{
			let dir = path.join(cwd, s);

			if (!fs.existsSync(dir))
			{
				fs.mkdirSync(dir);
			}

			return true;
		}

		return bool;
	})
}

export default createYarnWorkspaces;
