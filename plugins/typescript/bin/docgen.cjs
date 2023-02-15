#!/usr/bin/env node
const path = require('node:path');
const { register } = require('esbuild-register/dist/node');

register({});

const { setup } = require('onerepo');
const { typescript } = require('@onerepo/plugin-typescript');

(async () => {
	const { run } = await setup(
		/** @type import('onerepo').Config */
		{
			root: path.join(__dirname, '..', '..', '..'),
			subcommandDir: false,
			core: {
				graph: false,
				install: false,
				tasks: false,
			},
			plugins: [typescript()],
		}
	);

	await run();
})();