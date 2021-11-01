import {createRequire} from 'node:module';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import makeProvider from '@ava/typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const provider = makeProvider({
	negotiateProtocol() {
		return {identifier: 'ava-3.2', ava: {version: '3.15.0'}, projectDir: __dirname};
	},
});

const worker = provider.worker({
	extensionsToLoadAsModules: [],
	state: {},
	...JSON.parse(process.argv[2]),
});

const ref = path.resolve(process.argv[3]);

if (worker.canLoad(ref)) {
	worker.load(ref, {requireFn: createRequire(import.meta.url)});
}
