import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'ava';
import makeProvider from '@ava/typescript';

test.beforeEach(async t => {
	const projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ava-typescript-rewrite-'));
	t.context.projectDirectory = projectDirectory;
	await fs.mkdir(path.join(projectDirectory, 'src/nested'), {recursive: true});
	await fs.mkdir(path.join(projectDirectory, 'src/special'), {recursive: true});
	await fs.mkdir(path.join(projectDirectory, 'build/special'), {recursive: true});
	await fs.writeFile(path.join(projectDirectory, 'package.json'), '{"type":"module"}');
	await fs.writeFile(path.join(projectDirectory, 'src/nested/example.test.ts'), 'export const value: number = 42;');
	await fs.writeFile(path.join(projectDirectory, 'build/special/example.test.js'), 'export const value = 42;');
	t.context.provider = makeProvider({
		negotiateProtocol: () => ({identifier: 'ava-9', projectDir: projectDirectory}),
	});
});

test.afterEach.always(async t => {
	await fs.rm(t.context.projectDirectory, {recursive: true, force: true});
});

for (const reverse of [false, true]) {
	const rewritePaths = reverse
		? {'src/nested/': 'build/special/', 'src/': 'build/'}
		: {'src/': 'build/', 'src/nested/': 'build/special/'};

	test(`resolves overlapping compilation output back to the existing source (reverse=${reverse})`, async t => {
		const {projectDirectory, provider} = t.context;
		const main = provider.main({config: {extensions: ['ts'], rewritePaths, compile: false}});
		const worker = provider.worker({state: await main.compile()});
		const source = path.join(projectDirectory, 'src/nested/example.test.ts');
		const compiled = path.join(projectDirectory, 'build/special/example.test.js');

		t.is(worker.resolveFile(source), compiled);
		t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(compiled), [source]);
		const loaded = await worker.load(source);
		t.is(loaded.value, 42);
	});

	test(`keeps all valid deleted source extensions across overlapping outputs (reverse=${reverse})`, t => {
		const {projectDirectory, provider} = t.context;
		const main = provider.main({config: {extensions: ['js', 'ts', 'tsx'], rewritePaths, compile: false}});
		const sources = main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/special/deleted.test.js'));

		t.deepEqual(sources.toSorted(), ['src/nested', 'src/special'].flatMap(directory => ['js', 'ts', 'tsx'].map(extension =>
			path.join(projectDirectory, directory, `deleted.test.${extension}`))).toSorted());
		t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'other/example.test.js')), null);
		t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/special/example.test.mjs')), null);
	});

	test(`preserves extension priority when an existing source is found (reverse=${reverse})`, async t => {
		const {projectDirectory, provider} = t.context;
		const source = path.join(projectDirectory, 'src/nested/example.test.js');
		await fs.writeFile(source, 'export const value = 42;');
		const main = provider.main({config: {extensions: ['js', 'ts', 'tsx'], rewritePaths, compile: false}});

		t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/special/example.test.js')), [source]);
	});
}

test('rejects reverse candidates shadowed by a more specific source mapping', async t => {
	const {projectDirectory, provider} = t.context;
	await fs.writeFile(path.join(projectDirectory, 'src/special/example.test.ts'), 'export const value: number = 42;');
	const main = provider.main({
		config: {
			extensions: ['ts'],
			rewritePaths: {'src/': 'build/', 'src/special/': 'elsewhere/'},
			compile: false,
		},
	});

	t.is(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/special/example.test.js')), null);
});

test('deduplicates deleted source candidates from equivalent rewrite paths', t => {
	const {projectDirectory, provider} = t.context;
	const main = provider.main({
		config: {
			extensions: ['ts', 'tsx'],
			rewritePaths: {'src/': 'build/', './src/': './build/'},
			compile: false,
		},
	});

	t.deepEqual(main.resolvePossibleOutOfBandCompilationSources(path.join(projectDirectory, 'build/deleted.test.js')), [
		path.join(projectDirectory, 'src/deleted.test.ts'),
		path.join(projectDirectory, 'src/deleted.test.tsx'),
	]);
});
