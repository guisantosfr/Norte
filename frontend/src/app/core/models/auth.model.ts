export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface UserRequestDTO {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDTO {
  tokenType: string;
  token: string;
  user: UserResponseDTO;
}
