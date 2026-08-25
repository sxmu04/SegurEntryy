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

import {
  Firestore,
  doc,
  getDoc,
  setDoc
} from '@angular/fire/firestore';

import { sendPasswordResetEmail } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private storage: Storage,
    private firestore: Firestore
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
  async uploadProfilePhoto(
    file: File,
    uid: string
  ): Promise<string> {

    const storageRef = ref(
      this.storage,
      `profiles/${uid}`
    );

    await uploadBytes(
      storageRef,
      file
    );

    return await getDownloadURL(
      storageRef
    );
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

  // =========================================================
  // SEGURENTRY
  // COMPROBAR SI YA EXISTE EL SUPERADMIN
  // =========================================================
  async isSystemInitialized(): Promise<boolean> {

    const configRef = doc(
      this.firestore,
      'system',
      'configuration'
    );

    const configSnapshot = await getDoc(configRef);

    if (!configSnapshot.exists()) {
      return false;
    }

    const data = configSnapshot.data();

    return data['superAdminInitialized'] === true;
  }

  // =========================================================
  // CREAR SUPERADMIN INICIAL
  // =========================================================
  async createInitialSuperAdmin(
    name: string,
    document: string,
    email: string,
    password: string
  ) {

    // -------------------------------------------------------
    // 1. COMPROBAR SI YA FUE INICIALIZADO
    // -------------------------------------------------------
    const alreadyInitialized =
      await this.isSystemInitialized();

    if (alreadyInitialized) {
      throw new Error(
        'SegurEntry ya ha sido inicializado.'
      );
    }

    // -------------------------------------------------------
    // 2. CREAR CUENTA EN FIREBASE AUTHENTICATION
    // -------------------------------------------------------
    const credential =
      await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

    const uid = credential.user.uid;

    // -------------------------------------------------------
    // 3. CREAR PERFIL DEL SUPERADMIN EN FIRESTORE
    // -------------------------------------------------------
    const userRef = doc(
      this.firestore,
      'users',
      uid
    );

    await setDoc(
      userRef,
      {
        uid,
        name,
        document,
        email,
        role: 'superadmin',
        status: 'active',
        createdAt: new Date()
      }
    );

    // -------------------------------------------------------
    // 4. MARCAR EL SISTEMA COMO INICIALIZADO
    // -------------------------------------------------------
    const configRef = doc(
      this.firestore,
      'system',
      'configuration'
    );

    await setDoc(
      configRef,
      {
        superAdminInitialized: true,
        superAdminUid: uid,
        initializedAt: new Date()
      },
      {
        merge: true
      }
    );

    return credential;
  }

}