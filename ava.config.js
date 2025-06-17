const avaConfig = {
	files: [
		'!test/broken-fixtures/**',
	],
	watchMode: {
		ignoreChanges: [
			'test/fixtures/**',
			'test/broken-fixtures/**',
		],
	},
	timeout: '60s',
};

export default avaConfig;
