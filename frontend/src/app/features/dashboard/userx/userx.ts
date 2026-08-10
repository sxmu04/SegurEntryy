import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserAccess {
  name: string;
  document: string;
  role: string;
  entry: string;
  exit: string;
  tempAccess: boolean;
}

@Component({
  selector: 'app-userx',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './userx.html',
  styleUrls: ['./userx.css']
})
export class UserxComponent {

  // =========================
  // DATA MOCK (puedes luego conectar Firebase)
  // =========================
  accesses: UserAccess[] = [
    {
      name: 'Carlos Pérez',
      document: '123456789',
      role: 'Admin',
      entry: '08:00',
      exit: '18:00',
      tempAccess: false
    },
    {
      name: 'Ana Torres',
      document: '987654321',
      role: 'Instructor',
      entry: '09:00',
      exit: '17:00',
      tempAccess: true
    }
  ];

  // =========================
  // FORM MODEL
  // =========================
  newUser: UserAccess = {
    name: '',
    document: '',
    role: 'Aprendiz',
    entry: '',
    exit: '',
    tempAccess: false
  };

  // =========================
  // STATS (PRO)
  // =========================
  get totalUsers(): number {
    return this.accesses.length;
  }

  get totalAdmins(): number {
    return this.accesses.filter(a => a.role === 'Admin').length;
  }

  get totalTemp(): number {
    return this.accesses.filter(a => a.tempAccess).length;
  }

  get totalPermanent(): number {
    return this.accesses.filter(a => !a.tempAccess).length;
  }

  // =========================
  // CRUD
  // =========================
  addUser() {
    if (!this.newUser.name || !this.newUser.document) return;

    this.accesses.push({ ...this.newUser });

    // reset form
    this.newUser = {
      name: '',
      document: '',
      role: 'Aprendiz',
      entry: '',
      exit: '',
      tempAccess: false
    };
  }

  deleteUser(index: number) {
    this.accesses.splice(index, 1);
  }


}