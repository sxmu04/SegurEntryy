import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  authState,
  User
} from '@angular/fire/auth';

import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '@angular/fire/storage';

import { sendPasswordResetEmail } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private storage: Storage
  ) { }

  // ==========================
  // REGISTRO
  // ==========================
  register(email: string, password: string) {
    return createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
  }

  // ==========================
  // LOGIN
  // ==========================
  login(email: string, password: string) {
    return signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
  }

  // ==========================
  // LOGIN GOOGLE
  // ==========================
  async loginWithGoogle() {

    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(
      this.auth,
      provider
    );

    const idToken = await result.user.getIdToken();

    return {
      user: result.user,
      idToken
    };

  }

  // ==========================
  // MÉTODOS DE INICIO DE SESIÓN
  // ==========================
  async getSignInMethods(email: string): Promise<string[]> {

    return await fetchSignInMethodsForEmail(
      this.auth,
      email
    );

  }

  // ==========================
  // SUBIR FOTO DE PERFIL
  // ==========================
  async uploadProfilePhoto(file: File, uid: string): Promise<string> {

    const storageRef = ref(
      this.storage,
      `profiles/${uid}`
    );

    await uploadBytes(storageRef, file);

    return await getDownloadURL(storageRef);

  }

  // ==========================
  // USUARIO ACTUAL
  // ==========================
  getUser(): User | null {
    return this.auth.currentUser;
  }

  // ==========================
  // ESTADO DE AUTENTICACIÓN
  // ==========================
  getAuthState(): Observable<User | null> {
    return authState(this.auth);
  }

  // ==========================
  // CERRAR SESIÓN
  // ==========================
  logout() {
    return signOut(this.auth);
  }

  // ==========================
  // RECUPERAR CONTRASEÑA
  // ==========================
  resetPassword(email: string) {
    return sendPasswordResetEmail(
      this.auth,
      email
    );
  }

}