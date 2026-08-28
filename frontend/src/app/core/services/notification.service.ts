import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  forkJoin,
  Observable,
  of,
  throwError
} from 'rxjs';

import {
  tap
} from 'rxjs/operators';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notificationsSubject =
    new BehaviorSubject<any[]>([]);

  notifications$ =
    this.notificationsSubject
      .asObservable();

  private unreadCountSubject =
    new BehaviorSubject<number>(0);

  unreadCount$ =
    this.unreadCountSubject
      .asObservable();

  private loadingSubject =
    new BehaviorSubject<boolean>(false);

  loading$ =
    this.loadingSubject
      .asObservable();


  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}


  private getCurrentUid(): string | null {

    const user =
      this.authService
        .getUser();

    if (!user) {
      return null;
    }

    return user.uid;

  }


  loadNotifications(): void {

    const uid =
      this.getCurrentUid();

    if (!uid) {

      this.notificationsSubject
        .next([]);

      this.unreadCountSubject
        .next(0);

      return;

    }

    this.loadingSubject
      .next(true);

    this.apiService
      .getNotifications(uid)
      .subscribe({

        next: (response: any) => {

          const notifications =
            this.extractNotifications(
              response
            );

          this.notificationsSubject
            .next(
              notifications
            );

          this.updateUnreadCount(
            notifications
          );

          this.loadingSubject
            .next(false);

        },

        error: (error: any) => {

          console.error(
            'Error cargando notificaciones:',
            error
          );

          // No borramos las notificaciones ya visibles
          // por un error temporal de red.
          this.loadingSubject
            .next(false);

        }

      });

  }


  loadUnreadNotifications(): void {

    const uid =
      this.getCurrentUid();

    if (!uid) {

      this.unreadCountSubject
        .next(0);

      return;

    }

    this.apiService
      .getUnreadNotifications(uid)
      .subscribe({

        next: (response: any) => {

          const notifications =
            this.extractNotifications(
              response
            );

          this.unreadCountSubject
            .next(
              notifications.length
            );

        },

        error: (error: any) => {

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

    const uid =
      this.getCurrentUid();

    if (!uid) {
      return;
    }

    const current =
      this.notificationsSubject
        .value;

    const notification =
      current.find(
        item =>
          item.id ===
          notificationId
      );

    if (
      !notification ||
      notification.read === true
    ) {
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
            current.map(
              item => {

                if (
                  item.id ===
                  notificationId
                ) {

                  return {
                    ...item,
                    read: true
                  };

                }

                return item;

              }
            );

          this.notificationsSubject
            .next(updated);

          this.updateUnreadCount(
            updated
          );

        },

        error: (error: any) => {

          console.error(
            'Error marcando notificación:',
            error
          );

        }

      });

  }


  markAllAsRead(): void {

    const uid =
      this.getCurrentUid();

    if (!uid) {
      return;
    }

    if (
      this.unreadCountSubject
        .value === 0
    ) {
      return;
    }

    this.apiService
      .markAllNotificationsAsRead(uid)
      .subscribe({

        next: () => {

          const updated =
            this.notificationsSubject
              .value
              .map(
                notification => ({
                  ...notification,
                  read: true
                })
              );

          this.notificationsSubject
            .next(updated);

          this.unreadCountSubject
            .next(0);

        },

        error: (error: any) => {

          console.error(
            'Error marcando todas:',
            error
          );

        }

      });

  }


  deleteNotification(
    notificationId: string
  ): Observable<any> {

    const uid =
      this.getCurrentUid();

    if (!uid) {

      return throwError(
        () =>
          new Error(
            'No hay un usuario autenticado.'
          )
      );

    }

    return this.apiService
      .deleteNotification(
        uid,
        notificationId
      )
      .pipe(

        tap(() => {

          const updated =
            this.notificationsSubject
              .value
              .filter(
                notification =>
                  notification.id !==
                  notificationId
              );

          this.notificationsSubject
            .next(updated);

          this.updateUnreadCount(
            updated
          );

        })

      );

  }


  deleteReadNotifications(): Observable<any[]> {

    const uid =
      this.getCurrentUid();

    if (!uid) {

      return throwError(
        () =>
          new Error(
            'No hay un usuario autenticado.'
          )
      );

    }

    const readNotifications =
      this.notificationsSubject
        .value
        .filter(
          notification =>
            notification.read === true &&
            !!notification.id
        );

    if (
      readNotifications.length === 0
    ) {

      return of([]);

    }

    const requests =
      readNotifications.map(
        notification =>
          this.apiService
            .deleteNotification(
              uid,
              notification.id
            )
      );

    return forkJoin(
      requests
    )
      .pipe(

        tap(() => {

          const readIds =
            new Set(
              readNotifications
                .map(
                  notification =>
                    notification.id
                )
            );

          const updated =
            this.notificationsSubject
              .value
              .filter(
                notification =>
                  !readIds.has(
                    notification.id
                  )
              );

          this.notificationsSubject
            .next(updated);

          this.updateUnreadCount(
            updated
          );

        })

      );

  }



  notifyReportGenerated(
    reportData: any
  ): Observable<any> {

    const uid =
      this.getCurrentUid();

    if (!uid) {

      return throwError(
        () =>
          new Error(
            'No hay un usuario autenticado.'
          )
      );

    }

    return this.apiService
      .createNotificationSystemEvent({
        event_type:
          'report_generated',

        actor_uid:
          uid,

        data:
          reportData
      })
      .pipe(

        tap(() => {

          this.loadNotifications();

        })

      );

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

    return (
      this.notificationsSubject
        .value
        .find(
          notification =>
            notification.id ===
            notificationId
        )
      || null
    );

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

    let notifications: any[] = [];

    if (
      Array.isArray(
        response
      )
    ) {

      notifications =
        response;

    } else if (
      response &&
      Array.isArray(
        response.notifications
      )
    ) {

      notifications =
        response.notifications;

    } else if (
      response &&
      Array.isArray(
        response.results
      )
    ) {

      notifications =
        response.results;

    }

    return [...notifications]
      .sort(
        (
          first: any,
          second: any
        ) => {

          const firstDate =
            new Date(
              first?.created_at ||
              first?.createdAt ||
              first?.time ||
              0
            )
              .getTime();

          const secondDate =
            new Date(
              second?.created_at ||
              second?.createdAt ||
              second?.time ||
              0
            )
              .getTime();

          return (
            secondDate -
            firstDate
          );

        }
      );

  }


  private updateUnreadCount(
    notifications: any[]
  ): void {

    const unread =
      notifications
        .filter(
          notification =>
            notification.read === false ||
            notification.read === undefined
        );

    this.unreadCountSubject
      .next(
        unread.length
      );

  }

}
