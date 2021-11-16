import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import makeProvider from '@ava/typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const createProviderMacro = (identifier, avaVersion, projectDir = __dirname) => (t, run) => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes(identifier));
		t.is(version, pkg.version);
		return {
			ava: {avaVersion},
			identifier,
			normalizeGlobPatterns: patterns => patterns,
			async findFiles({patterns}) {
				return patterns.map(file => path.join(projectDir, file));
			},
			projectDir,
		};
	},
}));

export default createProviderMacro;
