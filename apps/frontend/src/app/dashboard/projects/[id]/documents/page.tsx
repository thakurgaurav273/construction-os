'use client';

import React, { useState } from 'react';
import { File, FileText, Image as ImageIcon, LayoutGrid, List, Search, Upload, Filter, MoreVertical, Download, Eye, FileArchive, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@sitepilot/ui';

const categories = ['All Documents', 'Drawings', 'Permits', 'Safety', 'Contracts'];

const mockDocuments = [
  { id: 1, name: 'Architectural_Plans_v3.pdf', type: 'pdf', size: '12.4 MB', category: 'Drawings', date: '2023-10-14', author: 'Alex Manager', version: 'v3' },
  { id: 2, name: 'Structural_Analysis_Report.docx', type: 'doc', size: '2.1 MB', category: 'Drawings', date: '2023-10-12', author: 'Sarah Engineer', version: 'v1' },
  { id: 3, name: 'Site_Safety_Protocol_Q3.pdf', type: 'pdf', size: '4.8 MB', category: 'Safety', date: '2023-10-10', author: 'John Safety', version: 'v2' },
  { id: 4, name: 'Foundation_Permit_Approved.pdf', type: 'pdf', size: '1.2 MB', category: 'Permits', date: '2023-10-05', author: 'Alex Manager', version: 'v1' },
  { id: 5, name: 'Subcontractor_Agreement_Steel.pdf', type: 'pdf', size: '3.4 MB', category: 'Contracts', date: '2023-10-01', author: 'Legal Dept', version: 'v1' },
  { id: 6, name: 'Site_Map_Overview.png', type: 'image', size: '5.6 MB', category: 'Drawings', date: '2023-09-28', author: 'Surveyor', version: 'v4' },
];

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All Documents');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const filteredDocs = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'All Documents' || doc.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc': return <File className="h-8 w-8 text-blue-500" />;
      case 'image': return <ImageIcon className="h-8 w-8 text-emerald-500" />;
      default: return <FileArchive className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">Manage and track all project documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button><Upload className="mr-2 h-4 w-4" /> Upload</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar Categories */}
        <div className="w-full sm:w-48 shrink-0 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {cat}
            </button>
          ))}
          
          <div className="pt-6 mt-6 border-t">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Storage</p>
            <div className="px-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span>14.2 GB</span>
                <span className="text-muted-foreground">100 GB</span>
              </div>
              <Progress value={14.2} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search documents..." 
                className="pl-9 bg-muted/50" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center border rounded-md p-1 bg-muted/30">
              <button 
                className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border border-dashed border-border/60 bg-gradient-to-b from-muted/10 to-muted/30 rounded-xl text-muted-foreground transition-all duration-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="h-16 w-16 rounded-2xl bg-background border shadow-sm flex items-center justify-center mb-6">
                <FileArchive className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">No documents found</h3>
              <p className="text-sm max-w-sm text-center mb-6">We couldn&apos;t find any documents matching your current filters or search query.</p>
              <Button variant="outline" onClick={() => {setSearch(''); setActiveCategory('All Documents');}}><Filter className="mr-2 h-4 w-4" /> Clear Filters</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md" onClick={() => setSelectedDoc(doc)}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="mb-4 mt-2">{getFileIcon(doc.type)}</div>
                    <p className="font-medium text-sm truncate w-full mb-1">{doc.name}</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>{doc.size}</span> • <span>{doc.date}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{doc.version}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Date Modified</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedDoc(doc)}>
                      <td className="px-4 py-3 font-medium flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{doc.name}</span>
                        <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1 py-0">{doc.version}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.size}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.date}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="sm:max-w-md w-full border-l p-0 flex flex-col">
          {selectedDoc && (
            <>
              <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-background border flex items-center justify-center shadow-sm">
                    {getFileIcon(selectedDoc.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg leading-tight break-all">{selectedDoc.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      {selectedDoc.size} <span className="h-1 w-1 rounded-full bg-muted-foreground/30" /> {selectedDoc.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="default"><Download className="mr-2 h-4 w-4" /> Download</Button>
                  <Button className="flex-1" variant="outline"><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                </div>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Document Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Version</span>
                      <span className="col-span-2 font-medium"><Badge>{selectedDoc.version}</Badge></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Category</span>
                      <span className="col-span-2 font-medium">{selectedDoc.category}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Uploaded By</span>
                      <span className="col-span-2 font-medium">{selectedDoc.author}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Status</span>
                      <span className="col-span-2 font-medium text-emerald-600">Approved</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold mb-3">Recent Activity</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Eye className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">Viewed by <strong>Alex Manager</strong></p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5">
                        <Download className="h-3 w-3 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">Downloaded by <strong>Sarah Engineer</strong></p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
