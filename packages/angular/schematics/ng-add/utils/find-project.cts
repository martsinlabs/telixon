import { SchematicsException } from '@angular-devkit/schematics';
import type { ProjectDefinition, WorkspaceDefinition } from '@schematics/angular/utility';
import { APPLICATION_PROJECT_TYPE } from '../constants.cjs';

export type NamedProject = {
  name: string;
  project: ProjectDefinition;
};

/** The project named in the options, or the workspace's first application when no name is given. */
export function findProject(workspace: WorkspaceDefinition, name: string | undefined): NamedProject {
  if (name !== undefined) {
    const project: ProjectDefinition | undefined = workspace.projects.get(name);
    if (project === undefined) throw new SchematicsException(`No project named "${name}" in the workspace.`);
    return { name, project };
  }
  for (const [projectName, project] of workspace.projects) {
    if (project.extensions['projectType'] === APPLICATION_PROJECT_TYPE) return { name: projectName, project };
  }
  throw new SchematicsException('The workspace has no application to set up.');
}
