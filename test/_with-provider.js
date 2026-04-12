// eslint-disable-line ava/no-ignored-test-files
import path from 'node:path';
import test from 'ava';
import pkg from '../package.json' with {type: 'json'};
import makeProvider from '@ava/typescript';

const {file: testFile} = test.meta;

const createProviderMacro = (
	identifier,
	avaVersion,
	projectDirectory = import.meta.dirname,
) =>
	test.macro({
		exec(t, run) {
			return run(
				t,
				makeProvider({
					negotiateProtocol(identifiers, {version}) {
						t.true(identifiers.includes(identifier));
						t.is(version, pkg.version);
						return {
							ava: {avaVersion},
							identifier,
							normalizeGlobPatterns: patterns => patterns,
							async findFiles({patterns}) {
								return patterns.map(file =>
									path.join(projectDirectory, file));
							},
							projectDir: projectDirectory,
						};
					},
				}),
			);
		},
		title(title = '') {
			if (testFile.includes(identifier)) {
				return title;
			}

			return `${title} (with ${identifier} provider)`;
		},
	});

export default createProviderMacro;
