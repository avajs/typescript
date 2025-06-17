/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: [
			'test/broken-fixtures',
			'test/fixtures/**/compiled/**',
		],
	},
];

export default xoConfig;
