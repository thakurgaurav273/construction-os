'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { File, FileText, Image as ImageIcon, LayoutGrid, List, Search, Upload, Filter, MoreVertical, Download, Eye, Trash2, FileArchive } from 'lucide-react';
import { Card, CardContent } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@sitepilot/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@sitepilot/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { useDocuments, useUploadDocument, useDeleteDocument, useDocumentDownloadUrl, type ProjectDocument } from '@/hooks/api/use-documents';

const categories = ['All Documents', 'pdf', 'doc', 'image', 'file'];
const categoryLabels: Record<string, string> = { pdf: 'PDF', doc: 'Document', image: 'Image', file: 'Other' };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
    case 'doc': return <File className="h-8 w-8 text-blue-500" />;
    case 'image': return <ImageIcon className="h-8 w-8 text-emerald-500" />;
    default: return <FileArchive className="h-8 w-8 text-muted-foreground" />;
  }
}

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All Documents');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useDocuments(params.id);
  const uploadMutation = useUploadDocument(params.id);
  const deleteMutation = useDeleteDocument(params.id);
  const downloadMutation = useDocumentDownloadUrl(params.id);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'All Documents' || doc.type === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
      toast.success(`${file.name} uploaded`);
    } catch {
      toast.error('Upload failed');
    }
    event.target.value = '';
  };

  const handleDelete = async (doc: ProjectDocument) => {
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast.success(`${doc.name} deleted`);
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const { url } = await downloadMutation.mutateAsync(doc.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed');
    }
  };

  const totalBytes = documents.reduce((sum, d) => sum + d.size, 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">Manage and track all project documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleUploadClick} disabled={uploadMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 shrink-0 space-y-1">
          {['All Documents', 'pdf', 'doc', 'image', 'file'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {cat === 'All Documents' ? 'All Documents' : (categoryLabels[cat] ?? cat)}
            </button>
          ))}
          <div className="pt-6 mt-6 border-t">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Storage</p>
            <div className="px-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span>{totalGB < 0.01 ? `${formatBytes(totalBytes)}` : `${totalGB.toFixed(2)} GB`}</span>
                <span className="text-muted-foreground">100 GB</span>
              </div>
              <Progress value={Math.min(totalGB, 100)} className="h-1.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center border rounded-md p-1 bg-muted/30">
              <button className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('list')}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading documents…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border border-dashed rounded-xl text-muted-foreground">
              <FileArchive className="h-12 w-12 mb-4 text-primary/30" />
              <h3 className="font-semibold text-lg text-foreground mb-1">No documents yet</h3>
              <p className="text-sm text-center mb-4">Upload your first document using the Upload button above.</p>
              <Button variant="outline" onClick={handleUploadClick}><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md" onClick={() => setSelectedDoc(doc)}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="mb-4 mt-2">{getFileIcon(doc.type)}</div>
                    <p className="font-medium text-sm truncate w-full mb-1">{doc.name}</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>{formatBytes(doc.size)}</span> • <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{doc.type}</Badge>
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
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedDoc(doc)}>
                      <td className="px-4 py-3 font-medium flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center shrink-0">{getFileIcon(doc.type)}</div>
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{doc.name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{doc.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatBytes(doc.size)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(doc)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    <p className="text-sm text-muted-foreground mt-1">{formatBytes(selectedDoc.size)} · {new Date(selectedDoc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleDownload(selectedDoc)} disabled={downloadMutation.isPending}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => handleDelete(selectedDoc)} disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <h4 className="text-sm font-semibold">Document Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Type</span>
                    <span className="col-span-2 font-medium capitalize">{selectedDoc.type}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Uploaded by</span>
                    <span className="col-span-2 font-medium">{selectedDoc.uploadedBy?.name ?? '—'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Date</span>
                    <span className="col-span-2 font-medium">{new Date(selectedDoc.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Size</span>
                    <span className="col-span-2 font-medium">{formatBytes(selectedDoc.size)}</span>
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
