'use client';

import React, { useState } from 'react';
import { Users, Search, Filter, HardHat, Wrench, Zap, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';

import { projectDetails } from '@/data/demo';

const trades = [
  { name: 'Concrete Workers', icon: HardHat, count: 145, color: 'text-stone-500', bg: 'bg-stone-500/10' },
  { name: 'Electricians', icon: Zap, count: 42, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { name: 'Plumbers', icon: Wrench, count: 38, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Logistics', icon: Truck, count: 24, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export default function WorkforcePage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];
  const [search, setSearch] = useState('');

  const filteredTeam = project.team.filter((m: any) => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workforce</h2>
          <p className="text-muted-foreground">Manage on-site personnel and track attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
          <Button>Add Personnel</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,240</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Attendance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <Progress value={94.2} className="h-1.5 mt-2" indicatorColor="bg-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absenteeism</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.8%</div>
            <p className="text-xs text-muted-foreground text-amber-600 mt-1">72 workers reported absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subcontractors</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">2 contracts pending renewal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
            <CardDescription>Current breakdown of on-site trades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {trades.map((trade) => (
              <div key={trade.name} className="flex items-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${trade.bg} ${trade.color}`}>
                  <trade.icon className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{trade.name}</p>
                    <p className="text-sm text-muted-foreground">{trade.count}</p>
                  </div>
                  <Progress value={(trade.count / 249) * 100} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Key Personnel Directory</CardTitle>
                <CardDescription>Management and critical roles.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name or role..." 
                  className="pl-9 bg-muted/50" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {filteredTeam.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/60 rounded-xl bg-gradient-to-b from-muted/10 to-muted/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] m-4">
                <div className="h-16 w-16 rounded-2xl bg-background border shadow-sm flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No personnel found</h3>
                <p className="text-sm max-w-sm text-center mb-6">No team members match your current search criteria.</p>
                <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTeam.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] font-normal uppercase tracking-wider">Internal Team</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


