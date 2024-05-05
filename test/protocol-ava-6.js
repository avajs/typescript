import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import createProviderMacro from './_with-provider.js';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const package_ = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const withProvider = createProviderMacro('ava-6', '5.3.0');

const validateConfig = (t, provider, config) => {
	const error = t.throws(() => provider.main({config}));
	error.message = error.message.replace(`v${package_.version}`, 'v${pkg.version}'); // eslint-disable-line no-template-curly-in-string
	t.snapshot(error);
};

test('negotiates ava-6 protocol', withProvider, t => t.plan(2));

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

test('main() updateGlobs()', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.snapshot(main.updateGlobs({
		filePatterns: ['src/test.ts'],
		ignoredByWatcherPatterns: ['assets/**'],
	}));
});

test('main() interpretChange() without compilation', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.interpretChange(path.join(projectDirectory, 'src/foo.ts')), main.changeInterpretations.waitForOutOfBandCompilation);
	t.is(main.interpretChange(path.join(projectDirectory, 'build/foo.js')), main.changeInterpretations.unspecified);
	t.is(main.interpretChange(path.join(projectDirectory, 'src/foo.txt')), main.changeInterpretations.unspecified);
});

test('main() interpretChange() with compilation', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: 'tsc'}});
	t.is(main.interpretChange(path.join(projectDirectory, 'src/foo.ts')), main.changeInterpretations.unspecified);
	t.is(main.interpretChange(path.join(projectDirectory, 'build/foo.js')), main.changeInterpretations.ignoreCompiled);
	t.is(main.interpretChange(path.join(projectDirectory, 'src/foo.txt')), main.changeInterpretations.unspecified);
});

test('main() resolvePossibleOutOfBandCompilationSources() with compilation', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: 'tsc'}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.js')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() unknown extension', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.bar')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() not a build path', withProvider, (t, provider) => {
	const main = provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'lib/foo.js')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() .cjs but .cts not configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['ts'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.cjs')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() .mjs but .mts not configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['ts'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.mjs')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() .js but .ts not configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['cts'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.js')), null);
});

test('main() resolvePossibleOutOfBandCompilationSources() .cjs and .cjs and .cts configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['cjs', 'cts'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.cjs')), [path.join(projectDirectory, 'src/foo.cjs'), path.join(projectDirectory, 'src/foo.cts')]);
});

test('main() resolvePossibleOutOfBandCompilationSources() .mjs and .mjs and .mts configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['mjs', 'mts'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.mjs')), [path.join(projectDirectory, 'src/foo.mjs'), path.join(projectDirectory, 'src/foo.mts')]);
});

test('main() resolvePossibleOutOfBandCompilationSources() .js and .js, .ts and .tsx configured', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['js', 'ts', 'tsx'], rewritePaths: {'src/': 'build/'}, compile: false}});
	t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/foo.js')), [path.join(projectDirectory, 'src/foo.js'), path.join(projectDirectory, 'src/foo.ts'), path.join(projectDirectory, 'src/foo.tsx')]);
});

test('main() resolvePossibleOutOfBandCompilationSources() returns the first possible path that exists', withProvider, (t, provider) => {
	const main = provider.main({config: {extensions: ['js', 'ts', 'tsx'], rewritePaths: {'fixtures/load/': 'fixtures/load/compiled/'}, compile: false}});
	t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'fixtures/load/compiled/index.js')), [path.join(projectDirectory, 'fixtures/load/index.ts')]);
});
