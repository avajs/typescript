import path from 'node:path';
import test from 'ava';
import {deleteAsync} from 'del';
import {execaNode} from 'execa';
import createProviderMacro from './_with-provider.js';

const withProvider = createProviderMacro(
	'ava-6',
	'6.0.0',
	path.join(import.meta.dirname, 'fixtures'),
);
const withAltProvider = createProviderMacro(
	'ava-6',
	'6.0.0',
	path.join(import.meta.dirname, 'broken-fixtures'),
);

test.before('deleting compiled files', async t => {
	t.log(await deleteAsync('test/fixtures/typescript/compiled'));
	t.log(await deleteAsync('test/broken-fixtures/typescript/compiled'));
});

const compile = async provider => ({
	state: await provider
		.main({
			config: {
				rewritePaths: {
					'ts/': 'typescript/',
					'compiled/': 'typescript/compiled/',
				},
				compile: 'tsc',
			},
		})
		.compile(),
});

test(
	'worker(): load rewritten paths files',
	withProvider,
	async (t, provider) => {
		const {state} = await compile(provider);
		const {stdout, stderr} = await execaNode(
			path.join(import.meta.dirname, 'fixtures/install-and-load'),
			[
				JSON.stringify({state}),
				path.join(import.meta.dirname, 'fixtures/ts', 'file.ts'),
			],
			{cwd: path.join(import.meta.dirname, 'fixtures')},
		);
		if (stderr.length > 0) {
			t.log(stderr);
		}

		t.snapshot(stdout);
	},
);

test('worker(): runs compiled files', withProvider, async (t, provider) => {
	const {state} = await compile(provider);
	const {stdout, stderr} = await execaNode(
		path.join(import.meta.dirname, 'fixtures/install-and-load'),
		[
			JSON.stringify({state}),
			path.join(import.meta.dirname, 'fixtures/compiled', 'index.ts'),
		],
		{cwd: path.join(import.meta.dirname, 'fixtures')},
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});

test('compile() error', withAltProvider, async (t, provider) => {
	const {message} = await t.throwsAsync(compile(provider));

	t.snapshot(message);
});
