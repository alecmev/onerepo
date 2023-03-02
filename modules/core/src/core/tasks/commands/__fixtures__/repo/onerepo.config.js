/** @type import('onerepo').TaskConfig */
module.exports = {
	'pre-commit': { parallel: ['$0 lint', '$0 tsc'] },
	commit: { sequential: ['echo "commit"'] },
	'post-commit': { sequential: ['echo "post-commit"'] },
	build: { sequential: [{ match: '**/foo.json', cmd: 'build' }] },
};