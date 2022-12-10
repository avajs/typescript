import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import createProviderMacro from './_with-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const withProvider = createProviderMacro('ava-3.2', '3.15.0');

const validateConfig = (t, provider, config) => {
	const error = t.throws(() => provider.main({config}));
	error.message = error.message.replace(`v${pkg.version}`, 'v${pkg.version}'); // eslint-disable-line no-template-curly-in-string
	t.snapshot(error);
};

test('negotiates ava-3.2 protocol', withProvider, t => t.plan(2));

test('main() config validation: throw when config is not a plain object', withProvider, (t, provider) => {
	validateConfig(t, provider, false);
	validateConfig(t, provider, true);
	validateConfig(t, provider, null);
	validateConfig(t, provider, []);
});

test('main() config validation: throw when config contains keys other than \'extensions\', \'rewritePaths\' or \'compile\'', withProvider, (t, provider) => {
	validateConfig(t, provider, {compile: false, foo: 1, rewritePaths: {'src/': 'build/'}});
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

test('main() config validation: throw when config.compile is invalid', withProvider, (t, provider) => {
	validateConfig(t, provider, {rewritePaths: {'src/': 'build/'}, compile: 1});
	validateConfig(t, provider, {rewritePaths: {'src/': 'build/'}, compile: undefined});
});

test('main() config validation: rewrite paths must end in a /', withProvider, (t, provider) => {
	validateConfig(t, provider, {rewritePaths: {src: 'build/', compile: false}});
	validateConfig(t, provider, {rewritePaths: {'src/': 'build', compile: false}});
});

test('main() extensions: defaults to [\'ts\', \'cts\', \'mts\']', withProvider, (t, provider) => {
	t.deepEqual(provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}}).extensions, ['ts', 'cts', 'mts']);
});

test('main() extensions: returns configured extensions', withProvider, (t, provider) => {
	const extensions = ['tsx'];
	t.deepEqual(provider.main({config: {extensions, rewritePaths: {'src/': 'build/'}, compile: false}}).extensions, extensions);
});

test('main() extensions: always returns new arrays', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.not(main.extensions, main.extensions);
});

test('main() ignoreChange()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.true(main.ignoreChange(path.join(__dirname, 'src/foo.ts')));
	t.false(main.ignoreChange(path.join(__dirname, 'build/foo.js')));
});

test('main() resolveTestfile()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolveTestFile(path.join(__dirname, 'src/foo.ts')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'src/foo.cts')), path.join(__dirname, 'build/foo.cjs'));
	t.is(main.resolveTestFile(path.join(__dirname, 'src/foo.mts')), path.join(__dirname, 'build/foo.mjs'));
	t.is(main.resolveTestFile(path.join(__dirname, 'build/foo.js')), path.join(__dirname, 'build/foo.js'));
	t.is(main.resolveTestFile(path.join(__dirname, 'foo/bar.ts')), path.join(__dirname, 'foo/bar.ts'));
});

test('main() updateGlobs()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.snapshot(main.updateGlobs({
		filePatterns: ['src/test.ts'],
		ignoredByWatcherPatterns: ['assets/**'],
	}));
});
