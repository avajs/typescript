const path = require('path');
const test = require('ava');
const execa = require('execa');
const pkg = require('../package.json');
const makeProvider = require('..');

const withProvider = (t, run) => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes('ava-3'));
		t.is(version, pkg.version);
		return {
			ava: {version: '3.0.0'},
			identifier: 'ava-3',
			normalizeGlobPatterns: patterns => patterns,
			async findFiles({patterns}) {
				return patterns.map(file => path.join(__dirname, file));
			},
			projectDir: __dirname
		};
	}
}));

const validateConfig = (t, provider, config) => {
	const error = t.throws(() => provider.main({config}));
	error.message = error.message.replace(`v${pkg.version}`, 'v${pkg.version}'); // eslint-disable-line no-template-curly-in-string
	t.snapshot(error);
};

test('negotiates ava-3 protocol', withProvider, t => t.plan(2));

test('main() config validation: throw when config is not a plain object', withProvider, (t, provider) => {
	validateConfig(t, provider, false);
	validateConfig(t, provider, true);
	validateConfig(t, provider, null);
	validateConfig(t, provider, []);
});

test('main() config validation: throw when config contains keys other than \'extensions\' or \'rewritePaths\'', withProvider, (t, provider) => {
	validateConfig(t, provider, {foo: 1});
});

test('main() config validation: throw when config.extensions contains empty strings', withProvider, (t, provider) => {
	validateConfig(t, provider, {extensions: ['']});
});

test('main() config validation: throw when config.extensions contains non-strings', withProvider, (t, provider) => {
	validateConfig(t, provider, {extensions: [1]});
});

test('main() config validation: throw when config.extensions contains duplicates', withProvider, (t, provider) => {
	validateConfig(t, provider, {extensions: ['ts', 'ts']});
});

test('main() config validation: config may not be an empty object', withProvider, (t, provider) => {
	validateConfig(t, provider, {});
});

test('main() config validation: rewrite paths must end in a /', withProvider, (t, provider) => {
	validateConfig(t, provider, {rewritePaths: {src: 'build/'}});
	validateConfig(t, provider, {rewritePaths: {'src/': 'build'}});
});

test('main() extensions: defaults to [\'ts\']', withProvider, (t, provider) => {
	t.deepEqual(provider.main({config: {rewritePaths: {'src/': 'build/'}}}).extensions, ['ts']);
});

test('main() extensions: returns configured extensions', withProvider, (t, provider) => {
	const extensions = ['tsx'];
	t.deepEqual(provider.main({config: {extensions, rewritePaths: {'src/': 'build/'}}}).extensions, extensions);
});

test('main() extensions: always returns new arrays', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}}});
	t.not(main.extensions, main.extensions);
});

const compile = async provider => {
	return {
		state: await provider.main({
			config: {
				rewritePaths: {
					'typescript/': 'fixtures/'
				}
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
