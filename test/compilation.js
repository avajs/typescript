const path = require('path');
const test = require('ava');
const del = require('del');
const execa = require('execa');
const createProviderMacro = require('./_with-provider');

const withProvider = createProviderMacro('ava-3.2', '3.2.0');

test.before('deleting compiled files', async t => {
	t.log(await del('test/fixtures/compiled'));
});

const compile = async provider => {
	return {
		state: await provider.main({
			config: {
				rewritePaths: {
					'typescript/': 'fixtures/',
					'compiled/': 'fixtures/compiled/'
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
		['ava-3', JSON.stringify(state), path.join(__dirname, 'typescript', 'file.ts')],
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
		['ava-3', JSON.stringify(state), path.join(__dirname, 'compiled', 'typescript.ts')],
		{cwd: path.join(__dirname, 'fixtures')}
	);
	if (stderr.length > 0) {
		t.log(stderr);
	}

	t.snapshot(stdout);
});
