import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot: string = fileURLToPath(new URL('../../../', import.meta.url));
// The runner loads a packaged build, which puts the CommonJS output, the copied JSON, and the factory path under test.
// The output sits under node_modules so the compiled files resolve the schematics toolchain the way they do in dist.
const outDir: string = join(packageRoot, 'node_modules', '.cache', 'telixon-schematics-test');
const flagsStylesheet: string = '@telixon/angular/flags/flags.css';
const appConfigPath: string = '/projects/app/src/app/app.config.ts';
const angularJsonPath: string = '/angular.json';

let runner: SchematicTestRunner;
const messages: string[] = [];

type StylesJson = { projects: Record<string, { architect: Record<string, { options: { styles?: string[] } }> }> };

function styles(tree: UnitTestTree, project: string = 'app'): string[] {
  const workspace: StylesJson = JSON.parse(tree.readContent(angularJsonPath)) as StylesJson;
  return workspace.projects[project]?.architect['build']?.options.styles ?? [];
}

async function createWorkspace(): Promise<UnitTestTree> {
  return runner.runExternalSchematic('@schematics/angular', 'workspace', {
    name: 'workspace',
    version: '20.0.0',
    newProjectRoot: 'projects',
  });
}

async function createApplication(standalone: boolean = true): Promise<UnitTestTree> {
  const workspace: UnitTestTree = await createWorkspace();
  return runner.runExternalSchematic('@schematics/angular', 'application', { name: 'app', standalone }, workspace);
}

async function ngAdd(tree: UnitTestTree, options: Record<string, unknown> = {}): Promise<UnitTestTree> {
  return runner.runSchematic('ng-add', { project: 'app', preloadEngine: true, ...options }, tree);
}

beforeAll(() => {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const build = spawnSync(process.execPath, [join(packageRoot, 'scripts', 'build-schematics.mjs'), outDir], {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  if (build.status !== 0) throw new Error(`${build.stdout}\n${build.stderr}`);
  runner = new SchematicTestRunner('@telixon/angular', join(outDir, 'collection.json'));
  runner.logger.subscribe((entry): void => {
    messages.push(entry.message);
  });
}, 60_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('ng add @telixon/angular', () => {
  it('puts the flags stylesheet before the application styles', async () => {
    const tree: UnitTestTree = await ngAdd(await createApplication());

    expect(styles(tree)).toEqual([flagsStylesheet, 'projects/app/src/styles.css']);
  });

  it('provides provideTelixon with the engine preload in the application config', async () => {
    const tree: UnitTestTree = await ngAdd(await createApplication());
    const appConfig: string = tree.readContent(appConfigPath);

    expect(appConfig).toContain("import { provideTelixon } from '@telixon/angular';");
    expect(appConfig).toContain('provideTelixon({ preloadEngine: true })');
  });

  it('leaves the preload out on request', async () => {
    const tree: UnitTestTree = await ngAdd(await createApplication(), { preloadEngine: false });
    const appConfig: string = tree.readContent(appConfigPath);

    expect(appConfig).toContain('provideTelixon()');
    expect(appConfig).not.toContain('preloadEngine');
  });

  it('changes nothing on a second run', async () => {
    const once: UnitTestTree = await ngAdd(await createApplication());
    const angularJson: string = once.readContent(angularJsonPath);
    const appConfig: string = once.readContent(appConfigPath);

    const twice: UnitTestTree = await ngAdd(once);

    expect(twice.readContent(angularJsonPath)).toBe(angularJson);
    expect(twice.readContent(appConfigPath)).toBe(appConfig);
    expect(styles(twice).filter((entry: string): boolean => entry === flagsStylesheet)).toHaveLength(1);
  });

  it('provides provideTelixon in the root module of an NgModule application', async () => {
    const tree: UnitTestTree = await ngAdd(await createApplication(false));
    const modulePath: string | undefined = tree.files.find((path: string): boolean => path.endsWith('app-module.ts'));

    expect(modulePath).toBeDefined();
    const appModule: string = tree.readContent(modulePath ?? '');
    expect(appModule).toContain("import { provideTelixon } from '@telixon/angular';");
    expect(appModule).toContain('provideTelixon({ preloadEngine: true })');
    expect(styles(tree)).toContain(flagsStylesheet);
  });

  it('sets up the first application when no project is named', async () => {
    const tree: UnitTestTree = await runner.runSchematic('ng-add', { preloadEngine: true }, await createApplication());

    expect(styles(tree)).toContain(flagsStylesheet);
    expect(tree.readContent(appConfigPath)).toContain('provideTelixon({ preloadEngine: true })');
  });

  it('warns and leaves a library alone', async () => {
    const workspace: UnitTestTree = await createWorkspace();
    const withLibrary: UnitTestTree = await runner.runExternalSchematic(
      '@schematics/angular',
      'library',
      { name: 'lib' },
      workspace,
    );
    const angularJson: string = withLibrary.readContent(angularJsonPath);
    messages.length = 0;

    const tree: UnitTestTree = await ngAdd(withLibrary, { project: 'lib' });

    expect(tree.readContent(angularJsonPath)).toBe(angularJson);
    expect(messages.some((message: string): boolean => message.includes('lib is a library'))).toBe(true);
  });

  it('rejects a project the workspace lacks', async () => {
    await expect(ngAdd(await createApplication(), { project: 'missing' })).rejects.toThrow(
      'No project named "missing" in the workspace.',
    );
  });
});
