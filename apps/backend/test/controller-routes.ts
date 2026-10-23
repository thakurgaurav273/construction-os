import 'reflect-metadata';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

export const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

export type ControllerClass = { name: string; prototype: Record<string, unknown> };

export interface WriteRoute {
  /** `Controller.handler`, e.g. `PurchaseOrdersController.approve`. */
  key: string;
  handler: object;
}

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return controllerFiles(path);
    return entry.endsWith('.controller.ts') ? [path] : [];
  });
}

export async function loadControllers(): Promise<ControllerClass[]> {
  const modules = await Promise.all(controllerFiles(MODULES_DIR).map((file) => import(file) as Promise<Record<string, unknown>>));
  return modules.flatMap((exports) => Object.values(exports)
    .filter((value): value is ControllerClass => typeof value === 'function' && Reflect.hasMetadata(PATH_METADATA, value)));
}

/** Every non-GET route handler across the given controllers. */
export function writeRoutes(controllers: ControllerClass[]): WriteRoute[] {
  return controllers.flatMap((controller) => Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => {
      const handler = controller.prototype[name];
      if (name === 'constructor' || typeof handler !== 'function' || !Reflect.hasMetadata(PATH_METADATA, handler)) return false;
      return Reflect.getMetadata(METHOD_METADATA, handler) !== RequestMethod.GET;
    })
    .map((name) => ({ key: `${controller.name}.${name}`, handler: controller.prototype[name] as object })));
}
