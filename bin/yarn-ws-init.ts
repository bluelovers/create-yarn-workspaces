#!/usr/bin/env node

import createYarnWorkspaces from '..';
import * as yargs from 'yargs';
import * as path from 'path';

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
	.command('$0', '', function (yargs)
	{
		let name = yargs.argv.name || yargs.argv._[0];

		if (name)
		{
			name = path.join(CWD, name);
		}
		else
		{
			name = CWD;
		}

		//console.log(CWD, yargs.argv);

//		console.log(yargs.argv);

		let bool = createYarnWorkspaces(name, {
			ignoreExistsPackage: !!yargs.argv.ignoreExistsPackage,
		});

		//console.log(77777777777, bool);

		if (!bool)
		{
			yargs.showHelp();
		}
	})
	.version()
	.help()
	.argv
;
