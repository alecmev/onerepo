/** @type import('onerepo').TaskConfig */
module.exports = {
	'pre-merge': { sequential: [{ cmd: 'echo "pre-merge" "burritos"', meta: { good: 'yes' } }] },
	deploy: { parallel: ['echo "deployburritos"'] },
};
