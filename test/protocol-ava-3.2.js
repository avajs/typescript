const path = require('path');
const test = require('ava');
const withProvider = require('./_with-provider');

test('negotiates ava-3.2 protocol', withProvider, t => t.plan(2));

test('main() ignoreChange()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.true(main.ignoreChange(path.join(__dirname, 'src/foo.ts')));
	t.false(main.ignoreChange(path.join(__dirname, 'build/foo.js')));
});

test('main() resolveTestfile()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolveTestFile(path.join(__dirname, 'src/foo.ts')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'build/foo.js')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'foo/bar.ts')), path.join(__dirname, 'foo/bar.ts'));
});

test('main() updateGlobs()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.snapshot(main.updateGlobs({
		filePatterns: ['src/test.ts'],
		ignoredByWatcherPatterns: ['assets/**']
	}));
});
