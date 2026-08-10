import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private API_URL = 'http://127.0.0.1:8000/api/admin'; // tu backend

  constructor(private http: HttpClient) {}

  // 👥 USUARIOS
  getUsers(): Observable<any> {
    return this.http.get(`${this.API_URL}/users/`);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/users/`, data);
  }

  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/users/${id}/`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/${id}/`);
  }

  // 📩 INVITACIONES
  createInvitation(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/invitations/`, data);
  }

  validateInvitation(token: string): Observable<any> {
    return this.http.get(`${this.API_URL}/invitations/validate/${token}`);
  }
}