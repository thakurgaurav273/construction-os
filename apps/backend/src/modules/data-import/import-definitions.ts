import { ImportEntity } from '@prisma/client';
import type { Permission } from '@sitepilot/types';

export type ImportFieldType = 'text' | 'number' | 'date' | 'list' | 'option';

export interface ImportField {
  key: string;
  label: string;
  /** Told to the AI and shown next to the field, so both know what belongs here. */
  description: string;
  type: ImportFieldType;
  required: boolean;
  /** Allowed values for `option` fields. */
  options?: readonly string[];
  /** Headings organizations commonly use for this field; drives matching when AI isn't available. */
  synonyms: readonly string[];
}

export interface ImportEntityDefinition {
  entity: ImportEntity;
  label: string;
  /** What a member needs, on top of `data.import`, to import this kind of record. */
  permission: Permission;
  /** Whether rows that match an existing record can update it. Otherwise they are always skipped. */
  canUpdateExisting: boolean;
  /** Whether unmapped columns can be kept on the record (as material specifications). */
  keepsExtraColumns: boolean;
  /** Set when the import lands in one record (a contract's BOQ, a bill's measurement book) and starts from its page. */
  context?: 'contract' | 'ra_bill';
  fields: readonly ImportField[];
}

const text = (key: string, label: string, description: string, synonyms: string[], required = false): ImportField => ({
  key, label, description, type: 'text', required, synonyms,
});

const number = (key: string, label: string, description: string, synonyms: string[], required = false): ImportField => ({
  key, label, description, type: 'number', required, synonyms,
});

export const MATERIAL_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.MATERIAL,
  label: 'Materials',
  permission: 'material.manage',
  canUpdateExisting: true,
  keepsExtraColumns: true,
  fields: [
    text('name', 'Name', 'Material name or description', ['item', 'item name', 'material', 'description', 'item description', 'particulars'], true),
    text('sku', 'SKU / item code', 'Unique item code; existing materials are matched on it', ['code', 'item code', 'material code', 'part no', 'sku code'], true),
    text('unit', 'Unit', 'Unit of measure such as Bags, Nos, Kg, Cum', ['uom', 'unit of measure', 'units'], true),
    number('unitCost', 'Unit cost', 'Price per unit before GST', ['rate', 'price', 'cost', 'unit price', 'unit rate']),
    number('minStock', 'Minimum stock', 'Reorder level', ['min', 'min qty', 'reorder level', 'minimum', 'reorder qty']),
    number('maxStock', 'Maximum stock', 'Maximum stock to hold', ['max', 'max qty', 'maximum']),
    text('category', 'Category', 'Material category name; new categories are created', ['group', 'item group', 'type', 'material group']),
  ],
};

export const VENDOR_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.VENDOR,
  label: 'Vendors',
  permission: 'vendor.manage',
  canUpdateExisting: true,
  keepsExtraColumns: false,
  fields: [
    text('name', 'Name', 'Vendor or supplier company name', ['vendor', 'vendor name', 'supplier', 'supplier name', 'party', 'party name', 'company'], true),
    text('code', 'Vendor code', 'Your code for the vendor; existing vendors are matched on it (or on name)', ['code', 'vendor id', 'supplier code', 'party code']),
    { key: 'categories', label: 'Categories', description: 'What they supply, separated by commas', type: 'list', required: false, synonyms: ['category', 'supplies', 'material supplied', 'trade'] },
    text('contactPerson', 'Contact person', 'Main contact name', ['contact', 'contact name', 'person']),
    text('phone', 'Phone', 'Phone or mobile number', ['mobile', 'contact no', 'phone no', 'telephone']),
    text('email', 'Email', 'Email address', ['email id', 'mail']),
    text('gstNumber', 'GSTIN', '15-character GST number', ['gst', 'gst no', 'gstin no', 'gst number']),
    text('paymentTerms', 'Payment terms', 'e.g. 30 days credit', ['terms', 'credit terms', 'payment']),
    text('city', 'City', 'City', ['location', 'town']),
    text('state', 'State', 'State', ['region']),
  ],
};

export const OPENING_STOCK_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.OPENING_STOCK,
  label: 'Opening stock',
  permission: 'inventory.adjust',
  canUpdateExisting: true,
  keepsExtraColumns: false,
  fields: [
    text('material', 'Material', 'Material SKU or exact name from the catalogue', ['sku', 'item code', 'item', 'material code', 'item name'], true),
    text('warehouse', 'Store', 'Store or warehouse code or name', ['warehouse', 'store name', 'location', 'godown', 'site store'], true),
    number('quantity', 'Quantity on hand', 'Counted quantity in that store', ['qty', 'stock', 'balance', 'closing stock', 'opening stock', 'on hand'], true),
  ],
};

export const PURCHASE_ORDER_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.PURCHASE_ORDER,
  label: 'Purchase orders',
  permission: 'po.create',
  canUpdateExisting: false,
  keepsExtraColumns: false,
  fields: [
    text('reference', 'Your PO number', 'Your own order number; rows sharing it become one order', ['po no', 'po number', 'order no', 'po ref', 'indent no'], true),
    text('project', 'Project', 'Project code or name', ['site', 'project name', 'project code'], true),
    text('vendor', 'Vendor', 'Vendor code or name', ['supplier', 'party', 'vendor name'], true),
    text('category', 'Category', 'What is being bought, e.g. Cement', ['order category', 'type'], true),
    { key: 'expectedDelivery', label: 'Expected delivery', description: 'Delivery date, today or later', type: 'date', required: true, synonyms: ['delivery date', 'required by', 'due date', 'need by'] },
    { key: 'priority', label: 'Priority', description: 'LOW, MEDIUM, HIGH or CRITICAL', type: 'option', required: false, options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], synonyms: ['urgency'] },
    text('deliveryAddress', 'Delivery address', 'Where goods should be delivered', ['ship to', 'address', 'delivery location']),
    text('notes', 'Notes', 'Notes for the order', ['remarks', 'comments']),
    text('itemDescription', 'Item description', 'Line item description', ['item', 'description', 'material', 'particulars'], true),
    text('itemMaterial', 'Item SKU', 'Catalogue material SKU, so receipts post to stock', ['sku', 'item code', 'material code']),
    text('unit', 'Unit', 'Unit of measure', ['uom'], true),
    number('quantity', 'Quantity', 'Ordered quantity', ['qty', 'order qty'], true),
    number('rate', 'Rate', 'Price per unit before GST', ['price', 'unit price', 'unit rate'], true),
    number('taxPercent', 'GST %', 'GST percentage', ['gst', 'gst %', 'tax', 'tax %']),
    number('discountPercent', 'Discount %', 'Discount percentage', ['discount', 'disc %']),
  ],
};

export const BOQ_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.BOQ,
  label: 'Bill of quantities',
  permission: 'contract.manage',
  canUpdateExisting: true,
  keepsExtraColumns: false,
  context: 'contract',
  fields: [
    text('itemNo', 'Item no.', 'The contract item number, e.g. 50.1; existing lines are matched on it', ['item no', 'po item no', 'sl no', 'item', 'boq no', 's no'], true),
    text('rateCode', 'Rate code', 'Schedule of rates code such as DSR 2.32 or NS-1.1', ['dsr code', 'dsr item', 'code', 'sor code', 'ref']),
    text('description', 'Description', 'What the item is', ['description of items', 'descripion of items', 'particulars', 'item description', 'description of work'], true),
    text('unit', 'Unit', 'Unit of measure such as Sqm, Cum, Kg', ['uom', 'units'], true),
    number('quantity', 'BOQ quantity', 'Quantity agreed in the contract', ['qty', 'boq qty', 'as per boq', 'contract qty', 'quantity'], true),
    number('rate', 'Rate', 'Agreed rate per unit before GST', ['unit rate', 'rate rs', 'price'], true),
    number('previousQuantity', 'Certified before SitePilot', 'Quantity already certified on bills raised before this contract was in SitePilot', ['upto pre bill', 'upto previous bill', 'previous qty', 'certified till date', 'executed till date']),
  ],
};

export const MEASUREMENT_BOOK_IMPORT: ImportEntityDefinition = {
  entity: ImportEntity.MEASUREMENT_BOOK,
  label: 'Measurement book',
  permission: 'billing.prepare',
  canUpdateExisting: false,
  keepsExtraColumns: false,
  context: 'ra_bill',
  fields: [
    text('itemNo', 'Item no.', 'Contract item number on the row that starts each item, e.g. 50.1', ['po item no', 'item no', 'boq item', 'item'], true),
    text('description', 'Description', 'What was measured, e.g. Wall-1 or Deduction W1', ['particulars', 'details', 'description of work'], true),
    number('nos', 'Nos', 'Number of like parts', ['no', 'number', 'nos.', 'no of']),
    number('length', 'Length', 'Length in metres', ['l', 'len', 'length m']),
    number('breadth', 'Breadth / width', 'Breadth or width in metres', ['b', 'width', 'w', 'breadth m']),
    number('height', 'Height / depth', 'Height, depth or thickness in metres', ['h', 'depth', 'd', 'thickness']),
    number('quantity', 'Quantity', 'The row’s quantity as worked out in the sheet', ['qty', 'total', 'contents', 'quantity total'], true),
  ],
};

export const IMPORT_DEFINITIONS: Record<ImportEntity, ImportEntityDefinition> = {
  MATERIAL: MATERIAL_IMPORT,
  VENDOR: VENDOR_IMPORT,
  OPENING_STOCK: OPENING_STOCK_IMPORT,
  PURCHASE_ORDER: PURCHASE_ORDER_IMPORT,
  BOQ: BOQ_IMPORT,
  MEASUREMENT_BOOK: MEASUREMENT_BOOK_IMPORT,
};

/** Larger sheets should be split; every row runs the same checks as the screens that create records. */
export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
