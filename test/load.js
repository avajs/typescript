import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import {execaNode} from 'execa';
import createProviderMacro from './_with-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withProvider = createProviderMacro('ava-3.2', '3.2.0', path.join(__dirname, 'fixtures'));

const setup = async provider => ({
	state: await provider.main({
		config: {
			rewritePaths: {
				'load/': 'load/compiled/',
			},
			compile: false,
		},
	}).compile(),
});

test('worker(): load .cts', withProvider, async (t, provider) => {
	const {state} = await setup(provider);
	const {stdout, stderr} = await execaNode(
		path.join(__dirname, 'fixtures/install-and-load'),
		[JSON.stringify({state}), path.join(__dirname, 'fixtures/load', 'index.cts')],
		{cwd: path.join(__dirname, 'fixtures')},
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});

test('worker(): load .mts', withProvider, async (t, provider) => {
	const {state} = await setup(provider);
	const {stdout, stderr} = await execaNode(
		path.join(__dirname, 'fixtures/install-and-load'),
		[JSON.stringify({state}), path.join(__dirname, 'fixtures/load', 'index.mts')],
		{cwd: path.join(__dirname, 'fixtures')},
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});

test('worker(): load .ts', withProvider, async (t, provider) => {
	const {state} = await setup(provider);
	const {stdout, stderr} = await execaNode(
		path.join(__dirname, 'fixtures/install-and-load'),
		[JSON.stringify({extensionsToLoadAsModules: ['js'], state}), path.join(__dirname, 'fixtures/load', 'index.ts')],
		{cwd: path.join(__dirname, 'fixtures')},
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});
