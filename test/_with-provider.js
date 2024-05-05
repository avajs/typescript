import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import makeProvider from '@ava/typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const package_ = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const createProviderMacro = (identifier, avaVersion, projectDirectory = __dirname) => (t, run) => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes(identifier));
		t.is(version, package_.version);
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
