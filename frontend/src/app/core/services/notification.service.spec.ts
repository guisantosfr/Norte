import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationResponseDTO } from '../models/notification.model';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/notifications`;

  const mockNotification: NotificationResponseDTO = {
    id: 'notif-1',
    transactionId: 'tx-1',
    title: 'Lembrete de vencimento',
    message: 'A despesa Aluguel vence amanhã.',
    type: 'TRANSACTION_REMINDER',
    status: 'UNREAD',
    readAt: null,
    createdAt: '2026-11-11T09:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list notifications with optional status filter', () => {
    service.findAll('UNREAD').subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('notif-1');
    });

    const req = httpMock.expectOne(
      (request) => request.url === baseUrl && request.params.get('status') === 'UNREAD'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockNotification]);
  });

  it('should update unreadCount signal when getUnreadCount succeeds', () => {
    service.getUnreadCount().subscribe((res) => {
      expect(res.unreadCount).toBe(3);
    });

    const req = httpMock.expectOne(`${baseUrl}/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ unreadCount: 3 });

    expect(service.unreadCount()).toBe(3);
  });

  it('should decrement unreadCount when markAsRead succeeds and zero it on markAllAsRead', () => {
    service.unreadCount.set(2);

    service.markAsRead('notif-1').subscribe();
    const readReq = httpMock.expectOne(`${baseUrl}/notif-1/read`);
    expect(readReq.request.method).toBe('PATCH');
    readReq.flush({ ...mockNotification, status: 'READ', readAt: '2026-11-11T10:00:00Z' });

    expect(service.unreadCount()).toBe(1);

    service.markAllAsRead().subscribe();
    const readAllReq = httpMock.expectOne(`${baseUrl}/read-all`);
    expect(readAllReq.request.method).toBe('PATCH');
    readAllReq.flush(null);

    expect(service.unreadCount()).toBe(0);
  });
});
