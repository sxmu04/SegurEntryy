export class Users {

  showModal = false;

  users = [
    {
      id: 1,
      nombre: 'Juan Pérez',
      correo: 'juan@correo.com',
      rol: 'Administrador',
      estado: 'Activo'
    },
    {
      id: 2,
      nombre: 'María Gómez',
      correo: 'maria@correo.com',
      rol: 'Empleado',
      estado: 'Activo'
    },
    {
      id: 3,
      nombre: 'Carlos López',
      correo: 'carlos@correo.com',
      rol: 'Guardia',
      estado: 'Inactivo'
    },
    {
      id: 4,
      nombre: 'Ana Torres',
      correo: 'ana@correo.com',
      rol: 'Temporal',
      estado: 'Activo'
    }
  ];

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  editUser(user: any) {
    console.log('Editar', user);
  }

  deleteUser(user: any) {
    console.log('Eliminar', user);
  }

  viewUser(user: any) {
    console.log('Ver', user);
  }

}