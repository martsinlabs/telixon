import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { addRootProvider } from '@schematics/angular/utility';
import { PACKAGE_NAME, PRELOAD_ARGUMENTS, PROVIDER_NAME } from '../constants.cjs';

const PROVIDER_CALL = `${PROVIDER_NAME}(`;

function callsProvider(tree: Tree, sourceRoot: string): boolean {
  let found: boolean = false;
  tree.getDir(sourceRoot).visit((path, entry): void => {
    if (found || !path.endsWith('.ts') || entry === null || entry === undefined) return;
    found = entry.content.includes(PROVIDER_CALL);
  });
  return found;
}

/** Adds `provideTelixon` to the application's root providers unless a file under its source root already calls it. */
export function addProvider(projectName: string, sourceRoot: string, preloadEngine: boolean): Rule {
  return (tree: Tree, context: SchematicContext): Rule | Tree => {
    if (callsProvider(tree, sourceRoot)) {
      context.logger.info(`${PROVIDER_NAME} is already provided in ${projectName}.`);
      return tree;
    }
    const call: string = preloadEngine ? `(${PRELOAD_ARGUMENTS})` : '()';
    return addRootProvider(projectName, ({ code, external }) => code`${external(PROVIDER_NAME, PACKAGE_NAME)}${call}`);
  };
}
