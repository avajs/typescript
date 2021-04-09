const path = require('path');
const pkg = require('../package.json');
const makeProvider = require('..');

const withProvider = (t, run, identifier = 'ava-3.2') => run(t, makeProvider({
	negotiateProtocol(identifiers, {version}) {
		t.true(identifiers.includes(identifier));
		t.is(version, pkg.version);
		return {
			ava: {version: '3.2.0'},
			identifier,
			normalizeGlobPatterns: patterns => patterns,
			async findFiles({patterns}) {
				return patterns.map(file => path.join(__dirname, file));
			},
			projectDir: __dirname
		};
	}
}));

module.exports = withProvider;
