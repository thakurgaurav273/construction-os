import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  url: string;
  storageKey: string;
  entityType: string;
  projectId: string | null;
  organizationId: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

export function useDocuments(projectId: string) {
  return useQuery<ProjectDocument[]>({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/documents`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/projects/${projectId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/projects/${projectId}/documents/${documentId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });
}

export function useDocumentDownloadUrl(projectId: string) {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiClient.get(`/projects/${projectId}/documents/${documentId}/download`);
      return (res.data.data ?? res.data) as { url: string };
    },
  });
}
