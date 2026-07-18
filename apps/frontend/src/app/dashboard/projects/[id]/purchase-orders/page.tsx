'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Search, Filter, CheckCircle2, Clock, XCircle, FileText, 
  ChevronRight, ArrowRight, DollarSign, Package
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sitepilot/ui';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@sitepilot/ui';
import { Separator } from '@sitepilot/ui';

import { usePurchaseOrders, useApprovePurchaseOrder } from '@/hooks/api/use-purchase-orders';
import { PurchaseOrder } from '@/store/demo-store';

export default function PurchaseOrdersPage() {
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const approvePOMutation = useApprovePurchaseOrder();
  
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filteredPOs = purchaseOrders.filter((po: any) => 
    po.number?.toLowerCase().includes(search.toLowerCase()) ||
    po.vendor?.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = (poId: string) => {
    approvePOMutation.mutate(poId, {
      onSuccess: () => {
        toast.success('Purchase Order Approved', {
          description: `The PO has been approved and moved to fulfillment.`,
        });
        setSelectedPO(prev => prev ? { ...prev, status: 'approved' } : null);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'delivered': return <Package className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20';
      case 'delivered': return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">Manage and approve procurement requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
          <Button>Create PO</Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by PO number or vendor..." 
              className="pl-9 bg-muted/50" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPOs.map((po: any) => (
              <TableRow 
                key={po.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedPO(po)}
              >
                <TableCell className="font-medium">{po.number}</TableCell>
                <TableCell>{po.vendor}</TableCell>
                <TableCell>{format(new Date(po.createdDate), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(po.expectedDelivery), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right font-medium">
                  ${po.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(po.status)} variant="secondary">
                    {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                </TableCell>
              </TableRow>
            ))}
            {filteredPOs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* PO Drawer */}
      <Sheet open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto custom-scrollbar p-0">
          {selectedPO && (
            <div className="flex flex-col h-full">
              
              {/* Header */}
              <div className="p-6 pb-4 border-b bg-muted/20">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedPO.number}</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      {selectedPO.vendor} <ArrowRight className="h-3 w-3" /> {selectedPO.project}
                    </p>
                  </div>
                  <Badge className={getStatusColor(selectedPO.status)} variant="secondary">
                    {getStatusIcon(selectedPO.status)}
                    <span className="ml-1.5 capitalize">{selectedPO.status}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Created By</span>
                    <span className="font-medium">{selectedPO.createdBy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Created Date</span>
                    <span className="font-medium">{format(new Date(selectedPO.createdDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Expected Delivery</span>
                    <span className="font-medium text-amber-600">{format(new Date(selectedPO.expectedDelivery), 'MMM d, yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Total Amount</span>
                    <span className="font-bold text-lg">${selectedPO.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-6 flex-1">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Line Items</h3>
                <div className="rounded-md border mb-8">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.rate.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${item.tax.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">${item.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Approval Timeline */}
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Approval Flow</h3>
                <div className="space-y-4 pl-2">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      <div className="w-0.5 h-full bg-emerald-500/30 my-1" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(selectedPO.createdDate), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${['pending', 'approved', 'delivered'].includes(selectedPO.status) ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-muted'}`} />
                      <div className={`w-0.5 h-full ${['approved', 'delivered'].includes(selectedPO.status) ? 'bg-emerald-500/30' : 'bg-muted'} my-1`} />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">Submitted for Approval</p>
                      <p className="text-xs text-muted-foreground">By {selectedPO.createdBy}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${['approved', 'delivered'].includes(selectedPO.status) ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : selectedPO.status === 'pending' ? 'bg-amber-500 ring-4 ring-amber-500/20 animate-pulse' : 'bg-muted'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Project Director Approval</p>
                      <p className="text-xs text-muted-foreground">
                        {['approved', 'delivered'].includes(selectedPO.status) ? 'Approved' : 'Pending review'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t bg-background mt-auto flex items-center justify-between gap-3">
                <Button variant="ghost" className="text-muted-foreground">Download PDF</Button>
                
                {selectedPO.status === 'pending' ? (
                  <div className="flex gap-3">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10">Reject</Button>
                    <Button variant="secondary">Request Changes</Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(selectedPO.id)}
                    >
                      Approve PO
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" disabled>
                    {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                  </Button>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
