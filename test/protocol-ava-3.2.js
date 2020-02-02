const path = require('path');
const test = require('ava');
const pkg = require('../package.json');
const makeProvider = require('..');

const withProvider = (t, run) => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes('ava-3.2'));
		t.is(version, pkg.version);
		return {
			ava: {version: '3.2.0'},
			identifier: 'ava-3.2',
			normalizeGlobPatterns: patterns => patterns,
			async findFiles({patterns}) {
				return patterns.map(file => path.join(__dirname, file));
			},
			projectDir: __dirname
		};
	}
}));

test('negotiates ava-3.2 protocol', withProvider, t => t.plan(2));

test('main() ignoreChange()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}}});
	t.true(main.ignoreChange(path.join(__dirname, 'src/foo.ts')));
	t.false(main.ignoreChange(path.join(__dirname, 'build/foo.js')));
});

test('main() resolveTestfile()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}}});
	t.is(main.resolveTestFile(path.join(__dirname, 'src/foo.ts')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'build/foo.js')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'foo/bar.ts')), path.join(__dirname, 'foo/bar.ts'));
});

test('main() updateGlobs()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}}});
	t.snapshot(main.updateGlobs({
		filePatterns: ['src/test.ts'],
		ignoredByWatcherPatterns: ['assets/**']
	}));
});
