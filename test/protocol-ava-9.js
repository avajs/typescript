import path from 'node:path';
import test from 'ava';
import createProviderMacro from './_with-provider.js';

const projectDirectory = import.meta.dirname;
const withProvider = createProviderMacro('ava-9', '8.0.0');

test('negotiates ava-9 protocol', withProvider, t => t.plan(2));

test('main() extensions: retains the ava-8 defaults', withProvider, (t, provider) => {
	t.deepEqual(provider.main({config: {rewritePaths: {'src/': 'build/'}, compile: false}}).extensions, ['ts', 'mts']);
});

test('worker() resolves compiled files using the most specific source path', withProvider, async (t, provider) => {
	await Promise.all([
		{'src/': 'build/', 'src/nested/': 'other/'},
		{'src/nested/': 'other/', 'src/': 'build/'},
	].map(async rewritePaths => {
		const state = await provider.main({
			config: {
				extensions: ['ts', 'tsx', 'mts', 'cts', 'js'],
				rewritePaths,
				compile: false,
			},
		}).compile();
		const worker = provider.worker({state});

		for (const [extension, compiledExtension] of [['ts', 'js'], ['tsx', 'js'], ['mts', 'mjs'], ['cts', 'cjs'], ['js', 'js']]) {
			const reference = path.join(projectDirectory, `src/nested/test.${extension}`);
			t.true(worker.canLoad(reference));
			t.is(worker.resolveFile(reference), path.join(projectDirectory, `other/test.${compiledExtension}`));
		}

		t.false(worker.canLoad(path.join(projectDirectory, 'src-other/test.ts')));
		t.false(worker.canLoad(path.join(projectDirectory, 'src/nested/test.txt')));
	}));
});

test('worker() loads the same resolved files with modern module semantics', withProvider, async (t, provider) => {
	const state = await provider.main({
		config: {
			extensions: ['ts', 'mts', 'cts'],
			rewritePaths: {'./': 'missing/', 'fixtures/load/': 'fixtures/load/compiled/'},
			compile: false,
		},
	}).compile();
	const worker = provider.worker({state});

	await Promise.all(['ts', 'mts', 'cts'].map(async extension => {
		const reference = path.join(projectDirectory, `fixtures/load/index.${extension}`);
		await t.notThrowsAsync(worker.load(reference));
	}));
});
