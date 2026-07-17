'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sitepilot/ui';

// Mock data for the list
const historicalReports = [
  { id: 'dr-104', date: subDays(new Date(), 0).toISOString(), status: 'draft', author: 'Sarah Jenkins', weather: 'Partly Cloudy, 28°C', issues: 2 },
  { id: 'dr-103', date: subDays(new Date(), 1).toISOString(), status: 'approved', author: 'David Chen', weather: 'Sunny, 32°C', issues: 0 },
  { id: 'dr-102', date: subDays(new Date(), 2).toISOString(), status: 'approved', author: 'David Chen', weather: 'Sunny, 30°C', issues: 1 },
  { id: 'dr-101', date: subDays(new Date(), 3).toISOString(), status: 'flagged', author: 'Marcus Cole', weather: 'Heavy Rain, 22°C', issues: 4 },
  { id: 'dr-100', date: subDays(new Date(), 4).toISOString(), status: 'approved', author: 'Sarah Jenkins', weather: 'Cloudy, 25°C', issues: 0 },
];

export default function DailyReportsListPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReports = historicalReports.filter((report) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      report.author.toLowerCase().includes(query) ||
      report.weather.toLowerCase().includes(query) ||
      report.status.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Reports</h2>
          <p className="text-muted-foreground mt-1">
            Track daily site progress, weather, and safety logs.
          </p>
        </div>
        <Link href={`/dashboard/projects/${params.id}/daily-reports/new`}>
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
          <div className="flex items-center gap-4 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Author</th>
                  <th className="px-6 py-4 font-medium">Weather</th>
                  <th className="px-6 py-4 font-medium">Issues</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 font-medium flex items-center">
                      <FileText className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {format(new Date(report.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">{report.author}</td>
                    <td className="px-6 py-4 text-muted-foreground">{report.weather}</td>
                    <td className="px-6 py-4">
                      {report.issues > 0 ? (
                        <span className="flex items-center text-amber-600 dark:text-amber-500 font-medium">
                          <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> {report.issues} logged
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={report.status === 'approved' ? 'default' : report.status === 'flagged' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {report.status === 'approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {report.status === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                        {report.status === 'flagged' && <AlertCircle className="mr-1 h-3 w-3" />}
                        {report.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${params.id}/daily-reports/${report.id}`,
                          )
                        }
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
