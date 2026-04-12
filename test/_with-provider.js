import path from 'node:path';
import pkg from '../package.json' with {type: 'json'};
import makeProvider from '@ava/typescript';

const createProviderMacro = (identifier, avaVersion, projectDirectory = import.meta.dirname) => (t, run) => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes(identifier));
		t.is(version, pkg.version);
		return {
			ava: {avaVersion},
			identifier,
			normalizeGlobPatterns: patterns => patterns,
			async findFiles({patterns}) {
				return patterns.map(file => path.join(projectDirectory, file));
			},
			projectDir: projectDirectory,
		};
	},
}));

export default createProviderMacro;
