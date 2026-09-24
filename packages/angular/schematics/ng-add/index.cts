import { chain, noop, type Rule, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { APPLICATION_PROJECT_TYPE } from './constants.cjs';
import type { NgAddOptions } from './schema.cjs';
import { addFlagsStylesheet } from './utils/add-flags-stylesheet.cjs';
import { addProvider } from './utils/add-provider.cjs';
import { findProject } from './utils/find-project.cjs';

/** Adds the flags stylesheet to the application's styles and `provideTelixon` to its root providers. */
export function ngAdd(options: NgAddOptions): Rule {
  return async (tree: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await readWorkspace(tree);
    const { name, project } = findProject(workspace, options.project);
    if (project.extensions['projectType'] !== APPLICATION_PROJECT_TYPE) {
      context.logger.warn(`${name} is a library. Run ng add in the application that renders the phone field.`);
      return noop();
    }
    const sourceRoot: string = project.sourceRoot ?? `${project.root}/src`;
    return chain([addFlagsStylesheet(name), addProvider(name, sourceRoot, options.preloadEngine)]);
  };
}
