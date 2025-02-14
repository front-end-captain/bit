import React from 'react';
import { Text, Newline } from 'ink';
import { EnvService, EnvDefinition, Env, EnvContext, ServiceTransformationMap } from '@teambit/envs';
import highlight from 'cli-highlight';
import { Compiler } from './types';

export type CompilerDescriptor = {
  id: string;
  icon?: string;
  config?: string;
};

type CompilerTransformationMap = ServiceTransformationMap  & {
  getCompiler: () => Compiler;
}

export class CompilerService implements EnvService<{}, CompilerDescriptor> {
  name = 'Compile';

  render(env: EnvDefinition) {
    const descriptor = this.getDescriptor(env);

    return (
      <Text key={descriptor?.id}>
        <Text color="cyan">configured compiler: </Text>
        <Text>
          {descriptor?.id} ({descriptor?.displayName} @ {descriptor?.version})
        </Text>
        <Newline />
        <Text color="cyan">compiler config:</Text>
        <Newline />
        <Text>
          {descriptor?.config && highlight(descriptor?.config, { language: 'javascript', ignoreIllegals: true })}
        </Text>
        <Newline />
      </Text>
    );
  }

  transform(env: Env, context: EnvContext): CompilerTransformationMap | undefined {
    // Old env
    if (!env?.compiler) return undefined;
    return {
      getCompiler: () => env.compiler()(context),
    }
  }

  getDescriptor(env: EnvDefinition) {
    if (!env.env.getCompiler) return undefined;
    const compiler = env.env.getCompiler();

    return {
      id: compiler.id,
      icon: compiler.icon,
      config: compiler.displayConfig ? compiler.displayConfig() : undefined,
      version: compiler.version ? compiler.version() : '?',
      displayName: compiler.displayName ? compiler.displayName : '?',
    };
  }
}
