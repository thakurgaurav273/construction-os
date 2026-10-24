import { Package } from 'lucide-react';
import type { HelpModule } from '../types';

export const materialsHelp: HelpModule = {
  key: 'materials',
  title: 'Materials & inventory',
  icon: Package,
  routes: ['/dashboard/materials', '/dashboard/inventory'],
  tour: 'materials',
  guides: [
    {
      id: 'materials.catalogue',
      title: 'Add materials to the catalogue',
      summary: 'Define what you buy, with unit, category and reorder level.',
      permission: 'material.manage',
      steps: [
        'Open Materials and click Add Material.',
        'Enter the name, SKU, unit and category.',
        'Stock isn’t typed here: it comes from goods receipts, issues, returns and counts.',
      ],
    },
    {
      id: 'materials.stores',
      title: 'Set up stores and bins',
      summary: 'Warehouses and site stores where stock is kept.',
      permission: 'warehouse.manage',
      steps: [
        'Open Inventory → Warehouses and click Add Store for each warehouse or site store.',
        'Add bin locations if you track stock by rack or bin.',
        'Record opening stock with a count adjustment.',
      ],
    },
    {
      id: 'materials.issue',
      title: 'Issue material to a project',
      summary: 'Move stock from a store to site, with a numbered issue note.',
      permission: 'material.issue',
      keywords: ['min', 'mrn', 'return', 'consumption'],
      steps: [
        'Open the project’s Materials tab and click Issue Material.',
        'Pick the store, material and quantity. You can’t issue more than is available.',
        'Leftover stock goes back with Return, which creates a return note.',
      ],
    },
    {
      id: 'materials.transfer',
      title: 'Transfer stock between stores',
      summary: 'Request, approve and receive transfers.',
      permission: 'inventory.transfer',
      steps: [
        'Open Inventory → Transfers and click New Transfer.',
        'Someone else approves it; you can’t approve your own request.',
        'The receiving store marks it received, which moves the stock.',
      ],
    },
  ],
};
