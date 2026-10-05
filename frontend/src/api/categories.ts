import { apiClient } from './client';

export interface Subcategory {
  id: number;
  name: string;
  type: string;
  parent_id?: number | null;
  created_at: string;
}

export interface Category {
  id: number;
  user_id?: number | null;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  parent_id?: number | null;
  color?: string | null;
  icon?: string | null;
  subcategories: Subcategory[];
  created_at: string;
}

export interface CategoryCreatePayload {
  name: string;
  type: 'EXPENSE' | 'INCOME';
  parent_id?: number | null;
  color?: string;
  icon?: string;
}

export async function listCategoriesApi(type?: 'EXPENSE' | 'INCOME'): Promise<Category[]> {
  const params: any = {};
  if (type) params.type = type;
  const response = await apiClient.get<Category[]>('/categories/', { params });
  return response.data;
}

export async function createCategoryApi(data: CategoryCreatePayload): Promise<Category> {
  const response = await apiClient.post<Category>('/categories/', data);
  return response.data;
}

export async function deleteCategoryApi(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
