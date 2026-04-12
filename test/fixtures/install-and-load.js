import {createRequire} from 'node:module';
import path from 'node:path';
import process from 'node:process';
import makeProvider from '@ava/typescript';

const isAva8 = process.argv[2] === 'ava-8';

const provider = makeProvider({
	negotiateProtocol() {
		return {identifier: isAva8 ? 'ava-8' : 'ava-6', ava: {version: isAva8 ? '8.0.0' : '6.0.0'}, projectDir: import.meta.dirname};
	},
});

const worker = provider.worker({
	...(!isAva8 && {extensionsToLoadAsModules: []}),
	state: {},
	...JSON.parse(process.argv[3]),
});

const reference = path.resolve(process.argv[4]);

if (worker.canLoad(reference)) {
	if (isAva8) {
		worker.load(reference);
	} else {
		worker.load(reference, {requireFn: createRequire(import.meta.url)});
	}
}
