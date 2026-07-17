'use client';

import React, { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, TrendingUp, Truck, Plus, Filter, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';

import { projectDetails } from '@/data/demo';

const inventory = [
  { id: 'MAT-001', name: '16mm TMT Rebar', category: 'Steel', stock: 120, unit: 'Tons', minStock: 150, supplier: 'Metro Steel', consumption: 'High', status: 'low' },
  { id: 'MAT-002', name: 'C40 Ready Mix Concrete', category: 'Concrete', stock: 450, unit: 'm³', minStock: 200, supplier: 'BuildMat', consumption: 'Very High', status: 'optimal' },
  { id: 'MAT-003', name: 'Premium Glass Panels (A1)', category: 'Facade', stock: 12, unit: 'Pallets', minStock: 20, supplier: 'Global Glass', consumption: 'Medium', status: 'critical' },
  { id: 'MAT-004', name: 'Acoustic Ceiling Tiles', category: 'Interior', stock: 2400, unit: 'Boxes', minStock: 1000, supplier: 'InteriorPro', consumption: 'Low', status: 'optimal' },
  { id: 'MAT-005', name: 'HVAC Ducting Sections', category: 'MEP', stock: 85, unit: 'Units', minStock: 100, supplier: 'AirSys', consumption: 'Medium', status: 'low' },
];

const deliveries = [
  { id: 'DEL-104', material: 'Premium Glass Panels (A1)', quantity: '10 Pallets', expected: 'Today, 2:00 PM', status: 'delayed' },
  { id: 'DEL-105', material: '16mm TMT Rebar', quantity: '50 Tons', expected: 'Tomorrow, 8:00 AM', status: 'on-time' },
  { id: 'DEL-106', material: 'HVAC Ducting Sections', quantity: '40 Units', expected: 'Oct 18, 2023', status: 'on-time' },
];

export default function MaterialsPage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];
  const [search, setSearch] = useState('');

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Optimal</Badge>;
      case 'low': return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">Low Stock</Badge>;
      case 'critical': return <Badge variant="destructive" className="animate-pulse">Critical Shortage</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Materials & Inventory</h2>
          <p className="text-muted-foreground">Track stock levels, consumption rates, and incoming deliveries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Material</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" /> +4.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">3 Items</div>
            <p className="text-xs text-amber-600/80 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">3 expected today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Stock</CardTitle>
                <CardDescription>Real-time inventory levels across all storage zones.</CardDescription>
              </div>
              <Input 
                placeholder="Search materials..." 
                className="w-64 bg-muted/50" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-card overflow-x-auto w-full">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Material</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Stock</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map((item) => {
                    const progress = Math.min((item.stock / (item.minStock * 2)) * 100, 100);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.id} • {item.supplier}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium">{item.stock} {item.unit}</p>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <Progress 
                              value={progress} 
                              className="h-1.5 w-16" 
                              indicatorColor={item.status === 'critical' ? 'bg-red-500' : item.status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(item.status)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expected Deliveries</CardTitle>
              <CardDescription>Incoming shipments in the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-start gap-4 p-3 rounded-xl border bg-muted/20">
                  <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${delivery.status === 'delayed' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{delivery.material}</p>
                    <p className="text-xs text-muted-foreground">{delivery.quantity} • {delivery.id}</p>
                    <div className="flex items-center justify-between pt-1">
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${delivery.status === 'delayed' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {delivery.expected}
                      </p>
                      {delivery.status === 'delayed' && <Badge variant="destructive" className="h-4 text-[9px] px-1 py-0 rounded-sm">Delayed</Badge>}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                View full schedule <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>High Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">C40 Concrete</span>
                  </div>
                  <span className="text-sm text-muted-foreground">120 m³/day</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">16mm Rebar</span>
                  </div>
                  <span className="text-sm text-muted-foreground">18 Tons/day</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
