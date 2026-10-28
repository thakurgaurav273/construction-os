import 'reflect-metadata';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { relative } from 'node:path';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PlatformAdminGuard } from '../src/modules/ai/platform-admin.guard';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@sitepilot/types';
import { OrgRole } from '@prisma/client';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import {
  ALL_PERMISSIONS, ANY_PERMISSIONS_KEY, PERMISSIONS_KEY, PermissionsGuard, ROLE_PERMISSIONS, diffPermissions, memberPermissions,
  permissionsForRole, rolePermissions,
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
  // Personal: moves the member's own session to another organization they belong to.
  'AuthController.switchOrganization',
  'InvitationsController.accept',
  // Personal: a member manages only their own devices and notifications.
  'NotificationsController.registerDevice',
  'NotificationsController.unregisterDevice',
  'NotificationsController.markAllRead',
  'NotificationsController.markRead',
  'NotificationsController.remove',
  'NotificationsController.updatePreferences',
  // Personal: a member's own tour progress and checklist.
  'HelpController.updateTour',
  'HelpController.restartTour',
  'HelpController.restartAllTours',
  'HelpController.updateChecklist',
  // Personal: a member edits only their own profile, photo, password and sessions.
  'AccountController.updateProfile',
  'AccountController.uploadAvatar',
  'AccountController.removeAvatar',
  'AccountController.changePassword',
  'AccountController.endOtherSessions',
  'AccountController.endSession',
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
    // The platform console is guarded by the platform-admin allow-list instead of organization permissions.
    const platformGuarded = new Set(controllers
      .filter((controller) => (Reflect.getMetadata(GUARDS_METADATA, controller) ?? []).includes(PlatformAdminGuard))
      .map((controller) => controller.name));
    const unprotected = writeRoutes(controllers)
      .filter(({ key }) => !platformGuarded.has(key.split('.')[0]))
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
  it('gives owners and admins everything and viewers only projects and daily reports to read', () => {
    assert.deepEqual([...ROLE_PERMISSIONS.OWNER].sort(), [...ALL_PERMISSIONS].sort());
    assert.deepEqual([...ROLE_PERMISSIONS.ADMIN].sort(), [...ALL_PERMISSIONS].sort());
    assert.deepEqual(permissionsForRole('VIEWER').sort(), ['dailyReport.view', 'project.view']);
  });

  it('keeps money movement with finance and administrators', () => {
    for (const permission of ['payment.approve', 'payment.release'] as const) {
      const roles = Object.entries(ROLE_PERMISSIONS).filter(([, granted]) => granted.includes(permission)).map(([role]) => role).sort();
      assert.deepEqual(roles, ['ADMIN', 'FINANCE', 'OWNER'], `${permission} granted to ${roles.join(', ')}`);
    }
  });

  it('lets the people running sites manage the workforce', () => {
    const roles = Object.entries(ROLE_PERMISSIONS).filter(([, granted]) => granted.includes('workforce.manage')).map(([role]) => role).sort();
    assert.deepEqual(roles, ['ADMIN', 'OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER']);
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

  it('accepts any one of the listed permissions on shared lookups', () => {
    class Lookup { list(): void {} }
    Reflect.defineMetadata(ANY_PERMISSIONS_KEY, ['procurement.view', 'finance.view'], Lookup.prototype.list);
    const context = (permissions: Permission[]): ExecutionContext => ({
      getHandler: () => Lookup.prototype.list,
      getClass: () => Lookup,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext);
    assert.equal(guard.canActivate(context(['finance.view'])), true);
    assert.throws(() => guard.canActivate(context(['billing.view'])), ForbiddenException);
  });

  it('explains what is missing in plain words', () => {
    assert.throws(
      () => guard.canActivate(contextFor(Example.prototype.approve, ['finance.view'])),
      (error: Error) => error.message.includes('approve vendor invoices'),
    );
  });
});

/** Controllers of areas whose reads are gated by a view permission (ADR-050). */
const VIEW_GATED_CONTROLLERS = new Set([
  'ProjectsController', 'OrganizationDailyReportsController', 'DailyReportsController', 'DocumentsController',
  'VendorsController', 'RfqsController', 'PurchaseOrdersController', 'DeliveriesController', 'ProcurementInsightsController',
  'MaterialsController', 'MaterialRequestsController', 'ProjectMaterialsController', 'InventoryController',
  'WorkforceController', 'ProjectWorkforceController', 'AttendanceController', 'ReportsController',
]);
/** Reads deliberately open to every member: the project picker shows only names, for forms everywhere. */
const OPEN_READS = new Set(['ProjectsController.findOptions']);

describe('module view permissions', () => {
  let controllers: ControllerClass[] = [];
  before(async () => {
    controllers = await loadControllers();
  });

  it('gates every read in module areas behind a view permission', () => {
    const names = new Set(controllers.map((controller) => controller.name));
    assert.deepEqual([...VIEW_GATED_CONTROLLERS].filter((name) => !names.has(name)), [], 'a gated controller was renamed');
    const ungated: string[] = [];
    for (const controller of controllers) {
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        if (name === 'constructor' || typeof handler !== 'function' || !Reflect.hasMetadata(PATH_METADATA, handler)) continue;
        if (Reflect.getMetadata(METHOD_METADATA, handler) !== RequestMethod.GET) continue;
        const key = `${controller.name}.${name}`;
        if (!VIEW_GATED_CONTROLLERS.has(controller.name) || OPEN_READS.has(key)) continue;
        const required: Permission[] = [...(Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? []), ...(Reflect.getMetadata(PERMISSIONS_KEY, controller) ?? [])];
        const anyOf: Permission[] = Reflect.getMetadata(ANY_PERMISSIONS_KEY, handler) ?? [];
        if (![...required, ...anyOf].some((permission) => permission.endsWith('.view'))) ungated.push(key);
      }
    }
    assert.deepEqual(ungated, [], `Add a view permission to: ${ungated.join(', ')}`);
  });

  it('gives every role the view of each area it can act in', () => {
    const viewFor: Partial<Record<Permission, Permission>> = {
      'po.create': 'procurement.view', 'po.approve': 'procurement.view', 'rfq.manage': 'procurement.view', 'vendor.manage': 'procurement.view',
      'delivery.receive': 'procurement.view', 'material.manage': 'material.view', 'material.issue': 'material.view',
      'material.request': 'material.view', 'inventory.adjust': 'inventory.view', 'inventory.transfer': 'inventory.view',
      'warehouse.manage': 'inventory.view', 'workforce.manage': 'workforce.view', 'attendance.mark': 'workforce.view',
      'dailyReport.write': 'dailyReport.view', 'dailyReport.approve': 'dailyReport.view', 'report.manage': 'report.view',
      'project.update': 'project.view', 'project.members.manage': 'project.view',
    };
    for (const [role, granted] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of granted) {
        const view = viewFor[permission];
        if (view) assert.ok(granted.includes(view), `${role} has ${permission} without ${view}`);
      }
    }
  });
});

describe('customised permissions', () => {
  it('applies role changes, then the member’s own additions and removals', () => {
    const role = { granted: ['po.approve'], revoked: ['workforce.manage'] };
    const member = { granted: ['finance.view'], revoked: ['po.approve'] };
    const result = memberPermissions(OrgRole.SITE_ENGINEER, role, member);
    assert.ok(result.includes('finance.view'));
    assert.ok(!result.includes('po.approve'));
    assert.ok(!result.includes('workforce.manage'));
    assert.ok(result.includes('dailyReport.write'));
  });

  it('never restricts the owner and ignores permissions the product no longer has', () => {
    assert.equal(memberPermissions(OrgRole.OWNER, { granted: [], revoked: ALL_PERMISSIONS }, { granted: [], revoked: ['audit.view'] }).length, ALL_PERMISSIONS.length);
    assert.deepEqual(rolePermissions(OrgRole.VIEWER, { granted: ['retired.permission'], revoked: [] }).sort(), ['dailyReport.view', 'project.view']);
  });

  it('stores a chosen set as the smallest change from the base', () => {
    assert.deepEqual(diffPermissions(['project.view', 'dailyReport.view'], ['project.view', 'report.view']), { granted: ['report.view'], revoked: ['dailyReport.view'] });
  });
});
