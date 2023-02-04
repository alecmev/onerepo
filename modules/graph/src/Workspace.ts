import path from 'path';

export class Workspace {
	#packageJson: PackageJson;
	#location: string;
	#rootLocation: string;

	constructor(rootLocation: string, location: string, packageJson: PackageJson) {
		this.#rootLocation = rootLocation;
		this.#location = location;
		this.#packageJson = packageJson;
	}

	get name() {
		return this.#packageJson.name;
	}

	get description() {
		return this.#packageJson.description;
	}

	get isRoot() {
		return this.#rootLocation === this.#location;
	}

	get location() {
		return this.#location;
	}

	get version() {
		return this.#packageJson.version || undefined;
	}

	get main() {
		return this.#packageJson.main || 'index.js';
	}

	get packageJson() {
		return { ...this.#packageJson };
	}

	/**
	 * Get module name scope, eg `@onerepo`
	 */
	get scope(): string {
		return this.name.includes('/') ? this.name.split('/')[0] : '';
	}

	/**
	 * Allow custom array of aliases.
	 * If the fully qualified package name is scoped, this will include the un-scoped name
	 */
	get aliases(): Array<string> {
		const shortName = this.name.includes('/') ? this.name.split('/')[1] : false;
		const aliases = [...(this.#packageJson.alias || [])];
		if (shortName) {
			aliases.push(shortName);
		}
		return aliases;
	}

	get dependencies() {
		return this.#packageJson.dependencies || {};
	}

	get devDependencies() {
		return this.#packageJson.devDependencies || {};
	}

	get peerDependencies() {
		return this.#packageJson.peerDependencies || {};
	}

	get private() {
		return 'private' in this.#packageJson && Boolean(this.#packageJson.private);
	}

	get tasks(): TaskConfig {
		try {
			const { default: tasks } = require(this.resolve('onerepo.config'));
			return tasks;
		} catch (e) {
			return {} as TaskConfig;
		}
	}

	getTasks(lifecycle: string): Required<Tasks> {
		const empty = { parallel: [], sequential: [] };
		if (lifecycle in this.tasks) {
			// @ts-ignore
			return { ...empty, ...this.tasks[lifecycle] };
		}
		return empty;
	}

	resolve(...pathSegments: Array<string>): string {
		return path.resolve(this.#rootLocation, this.#location, ...pathSegments);
	}

	relative(to: string): string {
		return path.relative(this.#location, to);
	}
}

interface Person {
	name?: string;
	email?: string;
	url?: string;
}

export interface PackageJson {
	name: string;
	description?: string;
	version?: string;
	keywords?: Array<string>;
	homepage?: string;
	bugs?: { url?: string; email?: string };
	license: string;
	author?: string | Person;
	contributors?: Array<Person | string>;
	files?: Array<string>;
	main?: string;
	bin?: string | Record<string, string>;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional: boolean }>;
	bundleDependencies?: Array<string>;
	optionalDependencies?: Array<string>;
	overrides?: Record<string, string>;
	engines?: Record<string, string>;
	os?: Array<string>;
	// Custom
	alias?: Array<string>;
}

export interface PrivatePackageJson extends PackageJson {
	private: true;
	license: 'UNLICENSED';
	workspaces?: Array<string>;
}

export interface PublicPackageJson extends PackageJson {
	private?: false;
}

export interface PackageJsonWithLocation extends PackageJson {
	location: string;
}

type MatchTask = { match: string; cmd: string };
export type Task = string | MatchTask;
export type Tasks = {
	sequential?: Array<Task>;
	parallel?: Array<Task>;
};

export type TaskConfig<T extends string = never> = Record<T, Tasks>;