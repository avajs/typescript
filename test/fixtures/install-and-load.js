import {createRequire} from 'node:module';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import makeProvider from '@ava/typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const provider = makeProvider({
	negotiateProtocol() {
		return {identifier: 'ava-6', ava: {version: '6.0.0'}, projectDir: __dirname};
	},
});

const worker = provider.worker({
	extensionsToLoadAsModules: [],
	state: {},
	...JSON.parse(process.argv[2]),
});

const reference = path.resolve(process.argv[3]);

if (worker.canLoad(reference)) {
	worker.load(reference, {requireFn: createRequire(import.meta.url)});
}
