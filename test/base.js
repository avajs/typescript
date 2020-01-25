const test = require('ava');
const makeProvider = require('..');

test('bails when negotiating protocol returns `null`', t => {
	const provider = makeProvider({negotiateProtocol: () => null});
	t.is(provider, undefined);
});
