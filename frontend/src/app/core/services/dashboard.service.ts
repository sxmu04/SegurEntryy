import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // =====================================
  // DASHBOARD
  // =====================================

  getStats(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dashboard/stats/`
    );
  }

  getRecentUsers(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dashboard/recent-users/`
    );
  }

  getRecentAccess(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dashboard/recent-access/`
    );
  }

  getAccessByRole(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dashboard/access-role/`
    );
  }

  getAccessByDoor(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dashboard/access-door/`
    );
  }


  // =====================================
  // USUARIOS
  // =====================================

  getUsers(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/users/list/`
    );
  }

  createUser(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/users/create/`,
      data
    );
  }

  updateUser(uid: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/users/update/${uid}/`,
      data
    );
  }

  deleteUser(uid: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/users/delete/${uid}/`
    );
  }

  getUser(uid: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/users/${uid}/`
    );
  }


  // =====================================
  // INVITACIONES
  // =====================================

  getInvitations(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/invitations/list/`
    );
  }

  createInvitation(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/invitations/create/`,
      data
    );
  }

  validateInvitation(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/invitations/validate/`,
      data
    );
  }

  deleteInvitation(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/invitations/delete/${id}/`
    );
  }


  // =====================================
  // ACCESOS
  // =====================================

  getAccesses(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/access/`
    );
  }

  registerAccess(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/access/register/`,
      data
    );
  }


  // =====================================
  // REPORTES
  // =====================================

  getReports(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/reports/`
    );
  }


  // =====================================
  // FOTO DE PERFIL
  // =====================================

  uploadProfilePhoto(uid: string, photo: File): Observable<any> {

    const formData = new FormData();

    formData.append('uid', uid);
    formData.append('photo', photo);

    return this.http.post<any>(
      `${this.apiUrl}/users/upload-photo/`,
      formData
    );
  }
}