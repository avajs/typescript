import test from 'ava';
import makeProvider from '@ava/typescript';

test('bails when negotiating protocol returns `null`', t => {
	const provider = makeProvider({negotiateProtocol: () => null});
	t.is(provider, undefined);
});
