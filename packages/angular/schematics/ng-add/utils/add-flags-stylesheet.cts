import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { updateWorkspace, type TargetDefinition } from '@schematics/angular/utility';
import { APPLICATION_BUILDERS, FLAGS_STYLESHEET } from '../constants.cjs';

type StyleEntry = string | { input: string };

function stylePath(entry: StyleEntry): string {
  return typeof entry === 'string' ? entry : entry.input;
}

function bundlesStyles(target: TargetDefinition): boolean {
  return APPLICATION_BUILDERS.has(target.builder);
}

/** Puts the flags stylesheet first in the `styles` of every build target of the project that lacks it. */
export function addFlagsStylesheet(projectName: string): Rule {
  return (_tree: Tree, context: SchematicContext): Rule =>
    updateWorkspace((workspace): void => {
      const project = workspace.projects.get(projectName);
      if (project === undefined) return;
      for (const target of project.targets.values()) {
        if (!bundlesStyles(target)) continue;
        const options = (target.options ??= {});
        const styles = (options['styles'] ??= []) as StyleEntry[];
        if (styles.some((entry: StyleEntry): boolean => stylePath(entry) === FLAGS_STYLESHEET)) {
          context.logger.info(`${FLAGS_STYLESHEET} is already among the styles of ${projectName}.`);
          continue;
        }
        styles.unshift(FLAGS_STYLESHEET);
      }
    });
}
