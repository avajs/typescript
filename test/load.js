import path from 'node:path';
import test from 'ava';
import {execaNode} from 'execa';
import createProviderMacro from './_with-provider.js';

const setup = async provider => ({
	state: await provider
		.main({
			config: {
				rewritePaths: {
					'load/': 'load/compiled/',
				},
				compile: false,
			},
		})
		.compile(),
});

for (const [identifier, withProvider] of [
	[
		'ava-6',
		createProviderMacro(
			'ava-6',
			'6.0.0',
			path.join(import.meta.dirname, 'fixtures'),
		),
	],
	[
		'ava-8',
		createProviderMacro(
			'ava-8',
			'8.0.0',
			path.join(import.meta.dirname, 'fixtures'),
		),
	],
]) {
	test('worker(): load .cts', withProvider, async (t, provider) => {
		const {state} = await setup(provider);
		const {stdout, stderr} = await execaNode(
			path.join(import.meta.dirname, 'fixtures/install-and-load'),
			[
				identifier,
				JSON.stringify({state}),
				path.join(import.meta.dirname, 'fixtures/load', 'index.cts'),
			],
			{cwd: path.join(import.meta.dirname, 'fixtures')},
		);
		if (stderr.length > 0) {
			t.log(stderr);
		}

		t.snapshot(stdout);
	});

	test('worker(): load .mts', withProvider, async (t, provider) => {
		const {state} = await setup(provider);
		const {stdout, stderr} = await execaNode(
			path.join(import.meta.dirname, 'fixtures/install-and-load'),
			[
				identifier,
				JSON.stringify({state}),
				path.join(import.meta.dirname, 'fixtures/load', 'index.mts'),
			],
			{cwd: path.join(import.meta.dirname, 'fixtures')},
		);
		if (stderr.length > 0) {
			t.log(stderr);
		}

		t.snapshot(stdout);
	});

	test('worker(): load .ts', withProvider, async (t, provider) => {
		const {state} = await setup(provider);
		const {stdout, stderr} = await execaNode(
			path.join(import.meta.dirname, 'fixtures/install-and-load'),
			[
				identifier,
				JSON.stringify({extensionsToLoadAsModules: ['js'], state}),
				path.join(import.meta.dirname, 'fixtures/load', 'index.ts'),
			],
			{cwd: path.join(import.meta.dirname, 'fixtures')},
		);
		if (stderr.length > 0) {
			t.log(stderr);
		}

		t.snapshot(stdout);
	});
}
