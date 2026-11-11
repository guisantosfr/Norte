import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NotificationResponseDTO,
  NotificationStatus,
  UnreadCountResponseDTO,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  readonly unreadCount = signal<number>(0);

  findAll(status?: NotificationStatus): Observable<NotificationResponseDTO[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<NotificationResponseDTO[]>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<UnreadCountResponseDTO> {
    return this.http.get<UnreadCountResponseDTO>(`${this.apiUrl}/unread-count`).pipe(
      tap((response) => {
        this.unreadCount.set(response.unreadCount ?? 0);
      })
    );
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      error: () => {
        // Falha silenciosa em atualização de background do badge
      },
    });
  }

  markAsRead(id: string): Observable<NotificationResponseDTO> {
    return this.http.patch<NotificationResponseDTO>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.unreadCount.update((current) => Math.max(0, current - 1));
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCount.set(0);
      })
    );
  }
}
