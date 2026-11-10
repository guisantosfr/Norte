export interface CategoryRequestDTO {
  name: string;
}

export interface CategoryResponseDTO {
  id: string;
  userId: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
