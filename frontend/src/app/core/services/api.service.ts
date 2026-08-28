import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private API_URL =
    'http://127.0.0.1:8000/api';


  constructor(
    private http: HttpClient
  ) {}


  // ===========================
  // AUTH
  // ===========================

  login(
    email: string
  ) {

    return this.http.post(
      `${this.API_URL}/auth/login/`,
      {
        email
      }
    );

  }


  googleLogin(
    idToken: string
  ) {

    return this.http.post(
      `${this.API_URL}/auth/google-login/`,
      {
        id_token:
          idToken
      }
    );

  }


  checkProvider(
    email: string
  ) {

    return this.http.post(
      `${this.API_URL}/auth/check-provider/`,
      {
        email
      }
    );

  }


  // ===========================
  // INVITACIONES
  // ===========================

  validateInvitation(
    data: any
  ) {

    return this.http.post(
      `${this.API_URL}/invitations/validate/`,
      data
    );

  }


  createInvitation(
    data: any
  ) {

    return this.http.post(
      `${this.API_URL}/invitations/create/`,
      data
    );

  }


  // ===========================
  // USUARIOS
  // ===========================

  createUser(
    data: any
  ) {

    return this.http.post(
      `${this.API_URL}/users/create/`,
      data
    );

  }


  listUsers() {

    return this.http.get(
      `${this.API_URL}/users/list/`
    );

  }


  getUser(
    uid: string
  ) {

    return this.http.get(
      `${this.API_URL}/users/get/${uid}/`
    );

  }


  updateUser(
    uid: string,
    data: any
  ) {

    return this.http.put(
      `${this.API_URL}/users/update/${uid}/`,
      data
    );

  }


  deleteUser(
    uid: string
  ) {

    return this.http.delete(
      `${this.API_URL}/users/delete/${uid}/`
    );

  }


  completeRegistration(
    data: any
  ): Observable<any> {

    return this.http.post<any>(
      `${this.API_URL}/users/complete-registration/`,
      data
    );

  }


  // ===========================
  // ACCESOS
  // ===========================

  getAccessLogs() {

    return this.http.get(
      `${this.API_URL}/access/`
    );

  }


  registerAccess(
    data: any
  ) {

    return this.http.post(
      `${this.API_URL}/access/register/`,
      data
    );

  }


  // ===========================
  // NOTIFICACIONES
  // ===========================

  getNotifications(
    uid: string
  ) {

    return this.http.get(
      `${this.API_URL}/notifications/${uid}/`
    );

  }


  getUnreadNotifications(
    uid: string
  ) {

    return this.http.get(
      `${this.API_URL}/notifications/${uid}/unread/`
    );

  }


  markNotificationAsRead(
    uid: string,
    notificationId: string
  ) {

    return this.http.patch(
      `${this.API_URL}/notifications/${uid}/${notificationId}/read/`,
      {}
    );

  }


  markAllNotificationsAsRead(
    uid: string
  ) {

    return this.http.patch(
      `${this.API_URL}/notifications/${uid}/read-all/`,
      {}
    );

  }


  deleteNotification(
    uid: string,
    notificationId: string
  ) {

    return this.http.delete(
      `${this.API_URL}/notifications/${uid}/${notificationId}/`
    );

  }


  createNotificationSystemEvent(
    data: any
  ) {

    return this.http.post(
      `${this.API_URL}/notifications/system-event/`,
      data
    );

  }


  // ===========================
  // TEMPORALES
  // ===========================

  getTemporaryUserRequest(
    requestId: string
  ) {

    return this.http.get(
      `${this.API_URL}/temporary-users/requests/${requestId}/`
    );

  }


  approveTemporaryUser(
    requestId: string
  ) {

    return this.http.post(
      `${this.API_URL}/temporary-users/requests/${requestId}/approve/`,
      {}
    );

  }


  rejectTemporaryUser(
    requestId: string
  ) {

    return this.http.post(
      `${this.API_URL}/temporary-users/requests/${requestId}/reject/`,
      {}
    );

  }

}
