import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notificationsSubject =
    new BehaviorSubject<any[]>([]);

  notifications$ =
    this.notificationsSubject.asObservable();

  private unreadCountSubject =
    new BehaviorSubject<number>(0);

  unreadCount$ =
    this.unreadCountSubject.asObservable();

  private loadingSubject =
    new BehaviorSubject<boolean>(false);

  loading$ =
    this.loadingSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  private getCurrentUid(): string | null {

    const user = this.authService.getUser();

    if (!user) {
      return null;
    }

    return user.uid;
  }

  loadNotifications(): void {

    const uid = this.getCurrentUid();

    if (!uid) {
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
      return;
    }

    this.loadingSubject.next(true);

    this.apiService
      .getNotifications(uid)
      .subscribe({

        next: (response: any) => {

          const notifications =
            this.extractNotifications(response);

          this.notificationsSubject.next(
            notifications
          );

          this.updateUnreadCount(
            notifications
          );

          this.loadingSubject.next(false);
        },

        error: error => {

          console.error(
            'Error cargando notificaciones:',
            error
          );

          this.notificationsSubject.next([]);
          this.unreadCountSubject.next(0);

          this.loadingSubject.next(false);
        }

      });
  }

  loadUnreadNotifications(): void {

    const uid = this.getCurrentUid();

    if (!uid) {
      this.unreadCountSubject.next(0);
      return;
    }

    this.apiService
      .getUnreadNotifications(uid)
      .subscribe({

        next: (response: any) => {

          const notifications =
            this.extractNotifications(response);

          this.unreadCountSubject.next(
            notifications.length
          );
        },

        error: error => {

          console.error(
            'Error cargando notificaciones no leídas:',
            error
          );
        }

      });
  }

  markAsRead(
    notificationId: string
  ): void {

    const uid = this.getCurrentUid();

    if (!uid) {
      return;
    }

    this.apiService
      .markNotificationAsRead(
        uid,
        notificationId
      )
      .subscribe({

        next: () => {

          const updated =
            this.notificationsSubject.value.map(
              notification => {

                if (
                  notification.id === notificationId
                ) {

                  return {
                    ...notification,
                    read: true
                  };
                }

                return notification;
              }
            );

          this.notificationsSubject.next(
            updated
          );

          this.updateUnreadCount(
            updated
          );
        },

        error: error => {

          console.error(
            'Error marcando notificación:',
            error
          );
        }

      });
  }

  markAllAsRead(): void {

    const uid = this.getCurrentUid();

    if (!uid) {
      return;
    }

    this.apiService
      .markAllNotificationsAsRead(uid)
      .subscribe({

        next: () => {

          const updated =
            this.notificationsSubject.value.map(
              notification => ({
                ...notification,
                read: true
              })
            );

          this.notificationsSubject.next(
            updated
          );

          this.unreadCountSubject.next(0);
        },

        error: error => {

          console.error(
            'Error marcando todas:',
            error
          );
        }

      });
  }

  getNotifications(): Observable<any[]> {
    return this.notifications$;
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$;
  }

  getNotificationById(
    notificationId: string
  ): any | null {

    return this.notificationsSubject.value.find(
      notification =>
        notification.id === notificationId
    ) || null;
  }

  isTemporaryRequest(
    notification: any
  ): boolean {

    return (
      notification?.type ===
      'temporary_request'
    );
  }

  private extractNotifications(
    response: any
  ): any[] {

    if (Array.isArray(response)) {
      return response;
    }

    if (
      response &&
      Array.isArray(response.notifications)
    ) {

      return response.notifications;
    }

    if (
      response &&
      Array.isArray(response.results)
    ) {

      return response.results;
    }

    return [];
  }

  private updateUnreadCount(
    notifications: any[]
  ): void {

    const unread =
      notifications.filter(
        notification =>
          notification.read === false ||
          notification.read === undefined
      );

    this.unreadCountSubject.next(
      unread.length
    );
  }
}