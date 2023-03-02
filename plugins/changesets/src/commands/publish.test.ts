import path from 'node:path';
import inquirer from 'inquirer';
import type { Graph } from '@onerepo/graph';
import { getGraph } from '@onerepo/graph';
import * as git from '@onerepo/git';
import * as file from '@onerepo/file';
import * as subprocess from '@onerepo/subprocess';
import * as Publish from './publish';
import * as PublishConfig from '../publish-config';

import { getCommand } from '@onerepo/test-cli';

const { run } = getCommand(Publish);

vi.mock('@changesets/apply-release-plan');

describe('handler', () => {
	let graph: Graph;
	beforeEach(async () => {
		graph = getGraph(path.join(__dirname, '__fixtures__', 'repo'));
		vi.spyOn(git, 'updateIndex').mockResolvedValue('');
		vi.spyOn(git, 'getStatus').mockResolvedValue('');
		vi.spyOn(git, 'getBranch').mockResolvedValue(process.env.ONE_REPO_HEAD_BRANCH);
		vi.spyOn(subprocess, 'run').mockImplementation(({ cmd, args }) => {
			if (cmd === 'git' && args?.includes('rev-parse')) {
				return Promise.resolve(['123456', '']);
			}
			if (cmd === 'npm' && args?.includes('info')) {
				return Promise.resolve(['{"versions":["0.0.1"]}', '']);
			}
			return Promise.resolve(['', '']);
		});
		vi.spyOn(subprocess, 'batch').mockResolvedValue([['', '']]);
		vi.spyOn(PublishConfig, 'resetPackageJson').mockResolvedValue();
		vi.spyOn(file, 'write').mockResolvedValue();
	});

	test('does nothing if git working tree is dirty', async () => {
		vi.spyOn(git, 'getStatus').mockResolvedValue('M  Foobar');
		await run('', { graph });

		expect(subprocess.run).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Build workspaces' }));
		expect(subprocess.run).not.toHaveBeenCalledWith(
			expect.objectContaining({ cmd: 'npm', args: expect.arrayContaining(['publish']) })
		);
		expect(subprocess.batch).not.toHaveBeenCalled();
	});

	test('does nothing if not on head branch', async () => {
		vi.spyOn(git, 'getBranch').mockResolvedValue('tacos-tacos-tacos');
		await run('', { graph });

		expect(subprocess.run).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Build workspaces' }));
		expect(subprocess.run).not.toHaveBeenCalledWith(
			expect.objectContaining({ cmd: 'npm', args: expect.arrayContaining(['publish']) })
		);
		expect(subprocess.batch).not.toHaveBeenCalled();
	});

	test('can bypass the dirty working state check', async () => {
		vi.spyOn(git, 'getStatus').mockResolvedValue('M  Foobar');
		await run('--allow-dirty', { graph });

		expect(git.getStatus).not.toHaveBeenCalled();
	});

	test('publishes all workspaces', async () => {
		await run('', { graph });

		expect(subprocess.run).toHaveBeenCalledWith(
			expect.objectContaining({
				cmd: process.argv[1],
				args: ['tasks', '-c', 'build', '-w', 'burritos', 'churros', 'tacos', 'tortillas'],
			})
		);

		expect(subprocess.batch).toHaveBeenCalledWith([
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest'],
				opts: { cwd: expect.stringMatching(/\/modules\/burritos$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest', '--access', 'public'],
				opts: { cwd: expect.stringMatching(/\/modules\/churros$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest'],
				opts: { cwd: expect.stringMatching(/\/modules\/tacos$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest'],
				opts: { cwd: expect.stringMatching(/\/modules\/tortillas$/) },
			}),
		]);
	});

	test('does not publish workspaces that are already published versions', async () => {
		vi.spyOn(subprocess, 'run').mockImplementation(({ cmd, args }) => {
			if (cmd === 'git' && args?.includes('rev-parse')) {
				return Promise.resolve(['123456', '']);
			}
			if (cmd === 'npm' && args?.includes('info') && args?.includes('burritos')) {
				return Promise.resolve(['{"versions":["0.0.1","0.1.7"]}', '']);
			}
			if (cmd === 'npm' && args?.includes('info')) {
				return Promise.resolve(['{"versions":["0.0.1"]}', '']);
			}
			return Promise.resolve(['', '']);
		});
		await run('', { graph });

		expect(subprocess.run).not.toHaveBeenCalledWith(
			expect.objectContaining({
				cmd: process.argv[1],
				args: expect.arrayContaining(['tasks', '-c', 'build', '-w', 'burritos']),
			})
		);

		expect(subprocess.batch).not.toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					cmd: 'npm',
					args: ['publish', '--tag', 'latest'],
					opts: { cwd: expect.stringMatching(/\/modules\/burritos$/) },
				}),
			])
		);
	});

	test('prompts for OTP and passes to publish', async () => {
		vi.spyOn(inquirer, 'prompt').mockResolvedValue({ otp: '789012' });
		await run('--otp', { graph });

		expect(subprocess.batch).toHaveBeenCalledWith([
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest', '--otp', '789012'],
				opts: { cwd: expect.stringMatching(/\/modules\/burritos$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest', '--otp', '789012', '--access', 'public'],
				opts: { cwd: expect.stringMatching(/\/modules\/churros$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest', '--otp', '789012'],
				opts: { cwd: expect.stringMatching(/\/modules\/tacos$/) },
			}),
			expect.objectContaining({
				cmd: 'npm',
				args: ['publish', '--tag', 'latest', '--otp', '789012'],
				opts: { cwd: expect.stringMatching(/\/modules\/tortillas$/) },
			}),
		]);
	});
});