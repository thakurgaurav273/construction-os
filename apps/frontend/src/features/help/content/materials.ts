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
      id: 'materials.request',
      title: 'Request material for a site',
      summary: 'Ask the stores for material; they approve it and issue it.',
      permission: 'material.request',
      keywords: ['mrq', 'indent', 'requisition'],
      steps: [
        'Open the project’s Materials tab and click Request Material.',
        'Add each material with the quantity, and the date the site needs it by.',
        'Someone in the stores approves it; you can’t approve your own request.',
        'The stores issue it, all at once or in parts from different stores. You’re notified each time.',
      ],
    },
    {
      id: 'materials.fulfil',
      title: 'Approve and issue material requests',
      summary: 'Work through the sites’ requests from one queue.',
      permission: 'material.issue',
      steps: [
        'Open Materials → Requests. Open requests are listed first.',
        'Open a request to approve or reject it. A rejection needs a note for the site.',
        'Click Issue, pick the store, and adjust the quantities. Each material gets its own issue note.',
        'If the rest won’t be sent, Close the request with a note. What was issued stays issued.',
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
