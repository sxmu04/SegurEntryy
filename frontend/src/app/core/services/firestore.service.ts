import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collectionData
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import {
  normalizeColombiaDateTimes
} from '../utils/colombia-time.util';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private path = 'users';
  public users: any[] = [];
  public filteredUsers: any[] = [];

  constructor(private firestore: Firestore) { }

  // 📥 Leer usuarios en tiempo real y normalizar fechas a Colombia
  getUsers(): Observable<any[]> {
    const ref = collection(this.firestore, this.path);

    return collectionData(ref, { idField: 'id' })
      .pipe(
        map(data => normalizeColombiaDateTimes(data))
      );
  }

  // ➕ Crear
  createUser(data: any) {
    const ref = collection(this.firestore, this.path);
    return addDoc(ref, data);
  }

  // ✏️ Actualizar
  updateUser(id: string, data: any) {
    const ref = doc(this.firestore, `${this.path}/${id}`);
    return updateDoc(ref, data);
  }

  // 🗑️ Eliminar
  deleteUser(id: string) {
    const ref = doc(this.firestore, `${this.path}/${id}`);
    return deleteDoc(ref);
  }

  // 📥 Accesos en tiempo real con hora oficial de Colombia
  getAccessLogs(): Observable<any[]> {
    return collectionData(
      collection(this.firestore, 'access_logs'),
      {
        idField: 'id'
      }
    )
      .pipe(
        map(data => normalizeColombiaDateTimes(data))
      );
  }

  loadUsers() {
    this.getUsers().subscribe({
      next: (data: any[]) => {

        console.log('🔥 Usuarios Firestore:', data);

        this.users = data
          .map(u => ({
            id: u.id,
            name: u.name || u.nombre || 'Sin nombre',
            email: u.email || u.correo || 'Sin correo',
            role: (u.role || '').toLowerCase()
          }))
          .filter(u => u.role === 'aprendiz');

        this.filteredUsers = this.users;

        console.log('✅ Aprendices filtrados:', this.users);
      },

      error: (err: unknown) => {
        console.error('❌ Error cargando usuarios:', err);
      }
    });
  }

}
