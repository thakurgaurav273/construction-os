import 'reflect-metadata';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { relative } from 'node:path';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@sitepilot/types';
import {
  ALL_PERMISSIONS, PERMISSIONS_KEY, PermissionsGuard, ROLE_PERMISSIONS, permissionsForRole,
} from '../src/common/permissions';
import { ControllerClass, MODULES_DIR, loadControllers, writeRoutes } from './controller-routes';


/** Writes that are deliberately open to any signed-in member (or anonymous, for auth). */
const OPEN_WRITES = new Set([
  'AuthController.register',
  'AuthController.login',
  'AuthController.refresh',
  'AuthController.logout',
  // Signed-out flows: the reset link itself is the credential.
  'AuthController.forgotPassword',
  'AuthController.resetPassword',
  'InvitationsController.accept',
  // Personal: a member manages only their own devices and notifications.
  'NotificationsController.registerDevice',
  'NotificationsController.unregisterDevice',
  'NotificationsController.markAllRead',
  'NotificationsController.markRead',
  'NotificationsController.remove',
  'NotificationsController.updatePreferences',
]);

function requiredPermissions(controller: ControllerClass, handler: unknown): Permission[] {
  return [
    ...(Reflect.getMetadata(PERMISSIONS_KEY, controller) ?? []),
    ...(Reflect.getMetadata(PERMISSIONS_KEY, handler as object) ?? []),
  ];
}

describe('route permissions', () => {
  let controllers: ControllerClass[] = [];
  before(async () => {
    controllers = await loadControllers();
  });

  it('finds the controllers', () => {
    assert.ok(controllers.length >= 20, `only found ${controllers.length} controllers under ${relative(process.cwd(), MODULES_DIR)}`);
  });

  it('protects every write endpoint with its own permission', () => {
    // A class baseline such as finance.view only grants reading; each write must name its own permission.
    const unprotected = writeRoutes(controllers)
      .filter(({ key, handler }) => !OPEN_WRITES.has(key) && (Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? []).length === 0)
      .map(({ key }) => key);
    assert.deepEqual(unprotected, [], `Add @RequirePermission to: ${unprotected.join(', ')}`);
  });

  it('keeps financial reads behind finance.view', () => {
    for (const name of ['FinanceController', 'InvoicesController', 'PaymentsController']) {
      const controller = controllers.find((candidate) => candidate.name === name);
      assert.ok(controller, `${name} not found`);
      assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, controller), ['finance.view']);
    }
  });

  it('only references permissions from the catalogue', () => {
    const known = new Set<string>(ALL_PERMISSIONS);
    for (const controller of controllers) {
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        for (const permission of requiredPermissions(controller, controller.prototype[name])) {
          assert.ok(known.has(permission), `${controller.name}.${name} uses unknown permission ${permission}`);
        }
      }
    }
  });
});

describe('role catalogue', () => {
  it('gives owners and admins everything and viewers nothing', () => {
    assert.deepEqual([...ROLE_PERMISSIONS.OWNER].sort(), [...ALL_PERMISSIONS].sort());
    assert.deepEqual([...ROLE_PERMISSIONS.ADMIN].sort(), [...ALL_PERMISSIONS].sort());
    assert.deepEqual(permissionsForRole('VIEWER'), []);
  });

  it('keeps money movement with finance and administrators', () => {
    for (const permission of ['payment.approve', 'payment.release'] as const) {
      const roles = Object.entries(ROLE_PERMISSIONS).filter(([, granted]) => granted.includes(permission)).map(([role]) => role).sort();
      assert.deepEqual(roles, ['ADMIN', 'FINANCE', 'OWNER'], `${permission} granted to ${roles.join(', ')}`);
    }
  });

  it('hides financial data from site, store and procurement roles', () => {
    for (const role of ['SITE_ENGINEER', 'STORE_MANAGER', 'PROCUREMENT', 'VIEWER'] as const) {
      assert.ok(!permissionsForRole(role).includes('finance.view'), `${role} can see finance`);
    }
  });

  it('never grants an action without the data it acts on', () => {
    const financeActions: Permission[] = ['invoice.create', 'invoice.approve', 'payment.request', 'payment.approve', 'payment.release'];
    for (const [role, granted] of Object.entries(ROLE_PERMISSIONS)) {
      if (granted.some((permission) => financeActions.includes(permission))) {
        assert.ok(granted.includes('finance.view'), `${role} can act on finance without finance.view`);
      }
    }
  });
});

describe('PermissionsGuard', () => {
  class Example {
    open(): void {}
    approve(): void {}
  }
  Reflect.defineMetadata(PERMISSIONS_KEY, ['finance.view'], Example);
  Reflect.defineMetadata(PERMISSIONS_KEY, ['invoice.approve'], Example.prototype.approve);

  function contextFor(handler: () => void, permissions: Permission[]): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => Example,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext;
  }
  const guard = new PermissionsGuard(new Reflector());

  it('requires both the class baseline and the route permission', () => {
    assert.equal(guard.canActivate(contextFor(Example.prototype.approve, ['finance.view', 'invoice.approve'])), true);
    assert.throws(() => guard.canActivate(contextFor(Example.prototype.approve, ['invoice.approve'])), ForbiddenException);
    assert.throws(() => guard.canActivate(contextFor(Example.prototype.approve, ['finance.view'])), ForbiddenException);
  });

  it('applies the class baseline to undecorated routes', () => {
    assert.equal(guard.canActivate(contextFor(Example.prototype.open, ['finance.view'])), true);
    assert.throws(() => guard.canActivate(contextFor(Example.prototype.open, [])), ForbiddenException);
  });

  it('explains what is missing in plain words', () => {
    assert.throws(
      () => guard.canActivate(contextFor(Example.prototype.approve, ['finance.view'])),
      (error: Error) => error.message.includes('approve vendor invoices'),
    );
  });
});
