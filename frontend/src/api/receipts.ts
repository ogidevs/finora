import { apiClient } from './client';

export interface ReceiptScanResponse {
  amount?: number | null;
  date: string;
  currency: string;
  items_note?: string | null;
  raw_text: string;
}

export async function scanReceiptApi(file: File): Promise<ReceiptScanResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ReceiptScanResponse>('/receipts/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
