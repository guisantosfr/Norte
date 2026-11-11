export interface NoteRequestDTO {
  title?: string | null;
  content: string;
}

export interface NoteResponseDTO {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}
