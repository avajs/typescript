const path = require('path');
const makeProvider = require('../..');

const provider = makeProvider({
	negotiateProtocol() {
		return {identifier: process.argv[2], ava: {version: '3.0.0'}, projectDir: path.resolve(__dirname, '..')};
	}
});

const worker = provider.worker({
	extensionsToLoadAsModules: [],
	state: JSON.parse(process.argv[3])
});

const ref = path.resolve(process.argv[4]);

if (worker.canLoad(ref)) {
	worker.load(ref, {requireFn: require});
}
