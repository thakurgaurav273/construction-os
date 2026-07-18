import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@sitepilot/ui';
import { toast } from 'sonner';
import { 
  useCreateMaterial, 
  useMaterialCategories, 
  useMaterialSuppliers 
} from '@/hooks/api/use-materials';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sitepilot/ui';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.coerce.number().min(0, 'Must be positive').optional(),
  minStock: z.coerce.number().min(0).optional(),
  maxStock: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  warehouse: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MaterialFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MaterialFormDialog({ open, onClose }: MaterialFormDialogProps) {
  const createMaterial = useCreateMaterial();
  const { data: categories = [] } = useMaterialCategories();
  const { data: suppliers = [] } = useMaterialSuppliers();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      sku: '',
      unit: '',
      unitCost: 0,
      minStock: 0,
      maxStock: 0,
      categoryId: '',
      supplierId: '',
      warehouse: '',
    },
  });

  const categoryId = watch('categoryId');
  const supplierId = watch('supplierId');
  const warehouse = watch('warehouse');

  const onSubmit = async (data: FormValues) => {
    try {
      await createMaterial.mutateAsync(data);
      toast.success('Material added successfully');
      reset();
      onClose();
    } catch (error) {
      toast.error('Failed to create material');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Material Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="e.g. Kg, Ltrs, Nos" {...register('unit')} />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(val) => setValue('categoryId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={(val) => setValue('supplierId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label>Warehouse</Label>
              <Select value={warehouse} onValueChange={(val) => setValue('warehouse', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Central Store">Central Store</SelectItem>
                  <SelectItem value="Site Store - Whitefield">Site Store - Whitefield</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost (₹)</Label>
              <Input id="unitCost" type="number" step="0.01" {...register('unitCost')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input id="minStock" type="number" {...register('minStock')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input id="maxStock" type="number" {...register('maxStock')} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Material'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
