const path = require('path');
const test = require('ava');
const del = require('del');
const execa = require('execa');
const createProviderMacro = require('./_with-provider');

const withProvider = createProviderMacro('ava-3.2', '3.2.0', path.join(__dirname, 'fixtures'));

test.before('deleting compiled files', async t => {
	t.log(await del('test/fixtures/typescript/compiled'));
});

const compile = async provider => {
	return {
		state: await provider.main({
			config: {
				rewritePaths: {
					'ts/': 'typescript/',
					'compiled/': 'typescript/compiled/'
				},
				compile: true
			}
		}).compile()
	};
};

test('worker(): load rewritten paths files', withProvider, async (t, provider) => {
	const {state} = await compile(provider);
	const {stdout, stderr} = await execa.node(
		path.join(__dirname, 'fixtures/install-and-load'),
		[JSON.stringify(state), path.join(__dirname, 'fixtures/ts', 'file.ts')],
		{cwd: path.join(__dirname, 'fixtures')}
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});

test('worker(): runs compiled files', withProvider, async (t, provider) => {
	const {state} = await compile(provider);
	const {stdout, stderr} = await execa.node(
		path.join(__dirname, 'fixtures/install-and-load'),
		[JSON.stringify(state), path.join(__dirname, 'fixtures/compiled', 'index.ts')],
		{cwd: path.join(__dirname, 'fixtures')}
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});
