'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UploadCloud, Sparkles, User, Hammer, Truck, AlertTriangle, 
  Eye, Calendar, CloudRain, Save, FileText, CheckCircle2, Plus 
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';

// --- AI Stream Simulator ---
function useAiStream(start: boolean) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!start) return;
    
    const finalResponse = `### Executive Summary
Today's operations at the Marina Bay site proceeded smoothly despite early morning showers. Structural concrete pouring for the 22nd floor was completed 4 hours ahead of schedule.

### Today's Progress
- **Structural**: Poured 120 cubic meters of C40 concrete for core walls.
- **Electrical**: Rough-ins completed for 18th floor eastern wing.
- **Plumbing**: Riser installations progressed to the 19th floor.

### Risks Identified
- **Supply Chain**: Delay in the delivery of premium glass facades from the overseas vendor. Currently tracking 5 days late.
- **Weather**: Forecast indicates heavy rain tomorrow afternoon which may halt crane operations.

### Tomorrow's Plan
- Commence curing processes for the 22nd floor slab.
- Shift crane priorities to lifting HVAC units to the 15th-floor mechanical room before the expected rain.
- Continue internal framing on floors 15 through 17.

### Safety Observations
- **Positive**: Full compliance with PPE observed during the concrete pour.
- **Flagged**: One minor slip hazard identified near the temporary water station on the ground floor. Rectified immediately.

### Recommended Actions
1. **Expedite Facade Delivery**: Follow up with logistics coordinator regarding the glass delay.
2. **Weather Prep**: Secure all loose materials on open floors prior to tomorrow afternoon's forecasted storm.`;

    setIsTyping(true);
    let index = 0;
    
    // Simulate initial latency
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setContent(finalResponse.slice(0, index));
        index += 2; // Type 2 chars at a time for speed
        if (index > finalResponse.length) {
          clearInterval(interval);
          setIsTyping(false);
          setIsFinished(true);
        }
      }, 15);
      return () => clearInterval(interval);
    }, 1200);

    return () => clearTimeout(timer);
  }, [start]);

  return { content, isTyping, isFinished };
}

// --- Main Page ---
interface MaterialRow {
  name: string;
  quantity: string;
  unit: string;
}

interface EquipmentRow {
  name: string;
  hours: string;
  status: string;
}

export default function NewDailyReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [generatingAi, setGeneratingAi] = useState(false);
  const { content, isTyping, isFinished } = useAiStream(generatingAi);

  const [materials, setMaterials] = useState<MaterialRow[]>([
    { name: 'C40 Concrete', quantity: '120', unit: 'm³' },
    { name: 'Rebar 16mm', quantity: '450', unit: 'kg' },
  ]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([
    { name: 'Tower Crane T1', hours: '8', status: 'Active' },
    { name: 'Concrete Pump', hours: '4', status: 'Active' },
  ]);

  const handleGenerate = () => {
    setGeneratingAi(true);
    // Smooth scroll to bottom
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleAddMaterial = () => {
    setMaterials((rows) => [...rows, { name: '', quantity: '', unit: '' }]);
  };

  const handleAddEquipment = () => {
    setEquipment((rows) => [...rows, { name: '', hours: '', status: 'Active' }]);
  };

  const handleSaveDraft = () => {
    toast.success('Draft saved');
  };

  const handleDiscard = () => {
    router.back();
  };

  const handleSubmit = () => {
    toast.success('Report submitted');
    router.push(`/dashboard/projects/${params.id}/daily-reports`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link 
            href={`/dashboard/projects/${params.id}/daily-reports`}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Reports
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">New Daily Report</h2>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
          <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 group transition-all duration-300">
            <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> 
            Generate AI Summary
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Calendar className="mr-2 h-5 w-5 text-muted-foreground" /> General Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Weather</label>
              <div className="relative">
                <CloudRain className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="Morning Showers, 26°C" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Overall Progress %</label>
              <Input type="number" defaultValue="45" />
            </div>
          </CardContent>
        </Card>

        {/* Labour & Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5 text-muted-foreground" /> Labour & Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Trade</th>
                    <th className="px-4 py-3 text-left font-medium w-32">Present</th>
                    <th className="px-4 py-3 text-left font-medium w-32">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {['Concrete Workers', 'Electricians', 'Plumbers', 'Operators'].map((trade) => (
                    <tr key={trade} className="hover:bg-muted/20">
                      <td className="px-4 py-3">{trade}</td>
                      <td className="px-4 py-2"><Input type="number" defaultValue={Math.floor(Math.random() * 20) + 5} className="h-8" /></td>
                      <td className="px-4 py-2"><Input type="number" defaultValue="0" className="h-8" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Grid for Materials & Equipment */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><Hammer className="mr-2 h-5 w-5 text-muted-foreground" /> Materials Used</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {materials.map((material, index) => (
                <div key={index} className="flex gap-2">
                  <Input defaultValue={material.name} placeholder="Material" />
                  <Input defaultValue={material.quantity} placeholder="Qty" className="w-24" />
                  <Input defaultValue={material.unit} placeholder="Unit" className="w-24" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddMaterial}><Plus className="mr-2 h-4 w-4" /> Add Material</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><Truck className="mr-2 h-5 w-5 text-muted-foreground" /> Equipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipment.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input defaultValue={item.name} placeholder="Equipment" />
                  <Input defaultValue={item.hours} placeholder="Hrs" className="w-24" />
                  <Badge variant="default" className="flex items-center justify-center w-24">{item.status}</Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddEquipment}><Plus className="mr-2 h-4 w-4" /> Add Equipment</Button>
            </CardContent>
          </Card>
        </div>

        {/* Observations & Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Eye className="mr-2 h-5 w-5 text-muted-foreground" /> Issues & Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Record any incidents, delays, safety observations, or general notes..."
              defaultValue="Minor slip hazard near the temporary water station on the ground floor. Cleaned up immediately. Glass facade delivery from supplier is delayed by 5 days."
            />
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><UploadCloud className="mr-2 h-5 w-5 text-muted-foreground" /> Photos & Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer group">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Upload Site Photos</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Drag and drop images here, or click to browse. Supported formats: JPG, PNG, HEIC.
              </p>
            </div>
            
            {/* Mock Previews */}
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {[1,2,3].map((i) => (
                <div key={i} className="relative h-24 w-32 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-50" />
                  <span className="text-xs text-muted-foreground font-medium relative z-10">IMG_00{i}.jpg</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </motion.div>

      {/* AI Streaming Area */}
      <AnimatePresence>
        {generatingAi && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 40 }}
            className="overflow-hidden"
          >
            <Card className="border-indigo-500/30 shadow-lg shadow-indigo-500/5 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
              
              <CardHeader className="border-b bg-muted/20 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <CardTitle className="text-lg">AI Generated Summary</CardTitle>
                  </div>
                  
                  {isTyping ? (
                    <Badge variant="outline" className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 animate-pulse">
                      Generating...
                    </Badge>
                  ) : isFinished ? (
                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Ready for Review
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="animate-pulse">Connecting...</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 relative z-10 min-h-[300px]">
                {!content && !isFinished ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-h3:text-indigo-700 dark:prose-h3:text-indigo-400 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-ul:my-2 prose-li:my-0">
                    {/* Hack to render markdown-like output quickly for the demo */}
                    {content.split('\n').map((line, i) => {
                      if (line.startsWith('### ')) {
                        return <h3 key={i}>{line.replace('### ', '')}</h3>;
                      } else if (line.startsWith('- **')) {
                        const parts = line.replace('- **', '').split('**: ');
                        return <ul key={i}><li><strong>{parts[0]}</strong>: {parts[1]}</li></ul>;
                      } else if (line.startsWith('- ')) {
                        return <ul key={i}><li>{line.replace('- ', '')}</li></ul>;
                      } else if (line.startsWith('1. ') || line.startsWith('2. ')) {
                        const parts = line.substring(3).split('**: ');
                        return <ol start={parseInt(line.charAt(0))} key={i} className="list-decimal pl-4">
                          <li><strong>{parts[0]?.replace('**', '')}</strong>: {parts[1]}</li>
                        </ol>;
                      } else if (line.trim() !== '') {
                        return <p key={i} className="my-2 text-foreground/90">{line}</p>;
                      }
                      return null;
                    })}
                    {isTyping && <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />}
                  </div>
                )}

                {isFinished && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t flex justify-end gap-3"
                  >
                    <Button variant="outline" onClick={handleDiscard}>Discard</Button>
                    <Button onClick={handleSubmit}><Save className="mr-2 h-4 w-4" /> Save & Submit Report</Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
