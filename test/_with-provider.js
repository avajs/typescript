const path = require('path');
const pkg = require('../package.json');
const makeProvider = require('..');

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

module.exports = createProviderMacro;
