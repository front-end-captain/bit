/** @flow */
import v4 from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import R from 'ramda';
import npmClient from '../npm-client';
import { Scope, ComponentWithDependencies } from '../scope';
import { BitId } from '../bit-id';
import { ISOLATED_ENV_ROOT } from '../constants';
import { mkdirp } from '../utils';
import logger from '../logger/logger';
import { Consumer } from '../consumer';
import Component from '../consumer/component';

export type IsolateOptions = {
  writeToPath: ?string,
  writeBitDependencies: ?boolean,
  links: ?boolean,
  installPackages: ?boolean,
  noPackageJson: ?boolean,
  override: ?boolean,
  dist: ?boolean,
  conf: ?boolean,
  verbose: boolean
};

export default class Environment {
  path: string;
  scope: Scope;
  consumer: Consumer;

  constructor(scope: Scope, dir: ?string) {
    this.scope = scope;
    this.path = dir || path.join(scope.getPath(), ISOLATED_ENV_ROOT, v4());
    logger.debug(`creating a new isolated environment at ${this.path}`);
  }

  async create(): Promise<> {
    await mkdirp(this.path);
    this.consumer = await Consumer.createWithExistingScope(this.path, this.scope);
  }

  installNpmPackages(components: Component[], verbose: boolean): Promise<*> {
    return Promise.all(
      components.map((component) => {
        if (R.isEmpty(component.packageDependencies)) return Promise.resolve();
        return npmClient.install(component.packageDependencies, { cwd: component.writtenPath }, verbose);
      })
    );
  }

  /**
   * import a component end to end. Including importing the dependencies and installing the npm
   * packages.
   *
   * @param {string | BitId} rawId - the component id to isolate
   * @param {IsolateOptions} opts
   * @return {Promise.<Component>}
   */
  async isolateComponent(rawId: string | BitId, opts: IsolateOptions): Promise<ComponentWithDependencies> {
    const bitId = typeof rawId === 'string' ? BitId.parse(rawId) : rawId;
    const componentsWithDependencies = await this.scope.getMany([bitId]);
    const concreteOpts = {
      componentsWithDependencies,
      writeToPath: opts.writeToPath || this.path,
      force: opts.override,
      withPackageJson: !opts.noPackageJson,
      withBitJson: opts.conf,
      writeBitDependencies: opts.writeBitDependencies,
      createNpmLinkFiles: opts.createNpmLinkFiles,
      dist: opts.dist
    };
    await this.consumer.writeToComponentsDir(concreteOpts);
    const componentWithDependencies: ComponentWithDependencies = R.head(componentsWithDependencies);
    const componentWithDependenciesFlatten = [
      componentWithDependencies.component,
      ...componentWithDependencies.dependencies
    ];
    if (opts.installPackages) await this.installNpmPackages(componentWithDependenciesFlatten, opts.verbose);
    return componentWithDependencies;
  }

  getPath(): string {
    return this.path;
  }

  destroy(): Promise<*> {
    logger.debug(`destroying the isolated environment at ${this.path}`);
    return fs.remove(this.path);
  }
}
