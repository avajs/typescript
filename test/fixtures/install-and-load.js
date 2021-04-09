const path = require('path');
const makeProvider = require('../..');

const provider = makeProvider({
	negotiateProtocol() {
		return {identifier: 'ava-3', ava: {version: '3.0.0'}, projectDir: __dirname};
	}
});

const worker = provider.worker({
	extensionsToLoadAsModules: [],
	state: JSON.parse(process.argv[2])
});

const ref = path.resolve(process.argv[3]);

if (worker.canLoad(ref)) {
	worker.load(ref, {requireFn: require});
}
