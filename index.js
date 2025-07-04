import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import escapeStringRegexp from 'escape-string-regexp';
import {execa} from 'execa';

const package_ = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url)));
const help = `See https://github.com/avajs/typescript/blob/v${package_.version}/README.md`;

function isPlainObject(x) {
	return x !== null && typeof x === 'object' && Reflect.getPrototypeOf(x) === Object.prototype;
}

function validate(target, properties) {
	for (const key of Object.keys(properties)) {
		const {required, isValid} = properties[key];
		const missing = !Reflect.has(target, key);

		if (missing) {
			if (required) {
				throw new Error(`Missing '${key}' property in TypeScript configuration for AVA. ${help}`);
			}

			continue;
		}

		if (!isValid(target[key])) {
			throw new Error(`Invalid '${key}' property in TypeScript configuration for AVA. ${help}`);
		}
	}

	for (const key of Object.keys(target)) {
		if (!Reflect.has(properties, key)) {
			throw new Error(`Unexpected '${key}' property in TypeScript configuration for AVA. ${help}`);
		}
	}
}

async function compileTypeScript(projectDirectory) {
	return execa({preferLocal: true, cwd: projectDirectory})`tsc --incremental`;
}

const configProperties = {
	compile: {
		required: true,
		isValid(compile) {
			return compile === false || compile === 'tsc';
		},
	},
	rewritePaths: {
		required: true,
		isValid(rewritePaths) {
			if (!isPlainObject(rewritePaths)) {
				return false;
			}

			return Object.entries(rewritePaths).every(([from, to]) => from.endsWith('/') && typeof to === 'string' && to.endsWith('/'));
		},
	},
	extensions: {
		required: false,
		isValid(extensions) {
			return Array.isArray(extensions)
				&& extensions.length > 0
				&& extensions.every(extension => typeof extension === 'string' && extension !== '')
				&& new Set(extensions).size === extensions.length;
		},
	},
};

const changeInterpretations = Object.freeze(Object.assign(Object.create(null), {
	unspecified: 0,
	ignoreCompiled: 1,
	waitForOutOfBandCompilation: 2,
}));

export default function typescriptProvider({negotiateProtocol}) {
	const protocol = negotiateProtocol(['ava-6'], {version: package_.version});
	if (protocol === null) {
		return;
	}

	return {
		main({config}) {
			if (!isPlainObject(config)) {
				throw new Error(`Unexpected Typescript configuration for AVA. ${help}`);
			}

			validate(config, configProperties);

			const {
				extensions = ['ts', 'cts', 'mts'],
				rewritePaths: relativeRewritePaths,
				compile,
			} = config;

			const rewritePaths = Object.entries(relativeRewritePaths).map(([from, to]) => [
				path.join(protocol.projectDir, from),
				path.join(protocol.projectDir, to),
			]);
			const testFileExtension = new RegExp(`\\.(${extensions.map(extension => escapeStringRegexp(extension)).join('|')})$`);

			const watchMode = {
				changeInterpretations,
				interpretChange(filePath) {
					if (config.compile === false) {
						for (const [from] of rewritePaths) {
							if (testFileExtension.test(filePath) && filePath.startsWith(from)) {
								return changeInterpretations.waitForOutOfBandCompilation;
							}
						}
					}

					if (config.compile === 'tsc') {
						for (const [, to] of rewritePaths) {
							if (filePath.startsWith(to)) {
								return changeInterpretations.ignoreCompiled;
							}
						}
					}

					return changeInterpretations.unspecified;
				},

				resolvePossibleOutOfBandCompilationSources(filePath) {
					if (config.compile !== false) {
						return null;
					}

					// Only recognize .cjs, .mjs and .js files.
					if (!/\.(c|m)?js$/.test(filePath)) {
						return null;
					}

					for (const [from, to] of rewritePaths) {
						if (!filePath.startsWith(to)) {
							continue;
						}

						const rewritten = `${from}${filePath.slice(to.length)}`;
						const possibleExtensions = [];

						if (filePath.endsWith('.cjs')) {
							if (extensions.includes('cjs')) {
								possibleExtensions.push({replace: /\.cjs$/, extension: 'cjs'});
							}

							if (extensions.includes('cts')) {
								possibleExtensions.push({replace: /\.cjs$/, extension: 'cts'});
							}

							if (possibleExtensions.length === 0) {
								return null;
							}
						}

						if (filePath.endsWith('.mjs')) {
							if (extensions.includes('mjs')) {
								possibleExtensions.push({replace: /\.mjs$/, extension: 'mjs'});
							}

							if (extensions.includes('mts')) {
								possibleExtensions.push({replace: /\.mjs$/, extension: 'mts'});
							}

							if (possibleExtensions.length === 0) {
								return null;
							}
						}

						if (filePath.endsWith('.js')) {
							if (extensions.includes('js')) {
								possibleExtensions.push({replace: /\.js$/, extension: 'js'});
							}

							if (extensions.includes('ts')) {
								possibleExtensions.push({replace: /\.js$/, extension: 'ts'});
							}

							if (extensions.includes('tsx')) {
								possibleExtensions.push({replace: /\.js$/, extension: 'tsx'});
							}

							if (possibleExtensions.length === 0) {
								return null;
							}
						}

						const possibleDeletedFiles = [];
						for (const {replace, extension} of possibleExtensions) {
							const possibleFilePath = rewritten.replace(replace, `.${extension}`);

							// Pick the first file path that exists.
							if (fs.existsSync(possibleFilePath)) {
								return [possibleFilePath];
							}

							possibleDeletedFiles.push(possibleFilePath);
						}

						return possibleDeletedFiles;
					}

					return null;
				},
			};

			return {
				...watchMode,

				async compile() {
					if (compile === 'tsc') {
						await compileTypeScript(protocol.projectDir);
					}

					return {
						extensions: [...extensions],
						rewritePaths: [...rewritePaths],
					};
				},

				get extensions() {
					return [...extensions];
				},

				updateGlobs({filePatterns, ignoredByWatcherPatterns}) {
					return {
						filePatterns: [
							...filePatterns,
							'!**/*.d.ts',
							...Object.values(relativeRewritePaths).map(to => `!${to}**`),
						],
						ignoredByWatcherPatterns: [
							...ignoredByWatcherPatterns,
							...Object.values(relativeRewritePaths).flatMap(to => [
								`${to}**/*.js.map`,
								`${to}**/*.cjs.map`,
								`${to}**/*.mjs.map`,
							]),
						],
					};
				},
			};
		},

		worker({extensionsToLoadAsModules, state: {extensions, rewritePaths}}) {
			const importJs = extensionsToLoadAsModules.includes('js');
			const testFileExtension = new RegExp(`\\.(${extensions.map(extension => escapeStringRegexp(extension)).join('|')})$`);

			return {
				canLoad(reference) {
					return testFileExtension.test(reference) && rewritePaths.some(([from]) => reference.startsWith(from));
				},

				async load(reference, {requireFn}) {
					const [from, to] = rewritePaths.find(([from]) => reference.startsWith(from));
					let rewritten = `${to}${reference.slice(from.length)}`;
					let useImport = true;
					if (reference.endsWith('.cts')) {
						rewritten = rewritten.replace(/\.cts$/, '.cjs');
						useImport = false;
					} else if (reference.endsWith('.mts')) {
						rewritten = rewritten.replace(/\.mts$/, '.mjs');
					} else {
						rewritten = rewritten.replace(testFileExtension, '.js');
						useImport = importJs;
					}

					return useImport ? import(pathToFileURL(rewritten)) : requireFn(rewritten);
				},
			};
		},
	};
}
