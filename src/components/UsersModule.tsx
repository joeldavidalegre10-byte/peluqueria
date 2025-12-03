import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPlus, Trash2, Users, Shield, UserCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { ConfirmModal } from './ConfirmModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { getUsers, addUser, deleteUser } from '../utils/database';

export function UsersModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Estados para modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Estados para nuevo usuario
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cajero' as 'cajero' | 'admin',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const loaded = await getUsers();
      setUsers(loaded);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor complete todos los campos',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    // Verificar si el usuario ya existe
    if (users.some((u) => u.username === newUser.username)) {
      setConfirmModalProps({
        title: 'Usuario Existente',
        description: 'Ya existe un usuario con ese nombre de usuario',
        type: 'error',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
      };

      await addUser(user);
      await loadUsers();

      setShowAddModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'cajero' });

      setConfirmModalProps({
        title: '¡Usuario Creado!',
        description: `El usuario ${user.name} ha sido creado exitosamente`,
        type: 'success',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'Hubo un error al crear el usuario',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      await loadUsers();

      setShowDeleteModal(false);
      
      setConfirmModalProps({
        title: 'Usuario Eliminado',
        description: `El usuario ${userToDelete.name} ha sido eliminado del sistema`,
        type: 'success',
      });
      setUserToDelete(null);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'Hubo un error al eliminar el usuario',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const cajeros = users.filter((u) => u.role === 'cajero');
  const admins = users.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl">Gestión de Usuarios</h2>
          <p className="text-gray-600">Administra cajeros y administradores del sistema</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="lg">
          <UserPlus className="size-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administradores */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <Shield className="size-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Administradores</CardTitle>
                <p className="text-sm text-gray-600">{admins.length} usuarios</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {admins.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-purple-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="size-5 text-purple-600" />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user)}
                    disabled={admins.length === 1}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {admins.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay administradores</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cajeros */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <UserCircle className="size-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Cajeros</CardTitle>
                <p className="text-sm text-gray-600">{cajeros.length} usuarios</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cajeros.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserCircle className="size-5 text-green-600" />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {cajeros.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay cajeros</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para agregar usuario */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario para el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                placeholder="Ej: María González"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                placeholder="Ej: maria"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase() })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese una contraseña"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(v: 'cajero' | 'admin') => setNewUser({ ...newUser, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddUser} className="flex-1">
                <UserPlus className="size-4 mr-2" />
                Crear Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex justify-center mb-4 p-4 rounded-full bg-red-50 w-fit mx-auto">
              <Trash2 className="size-12 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl">¿Eliminar Usuario?</DialogTitle>
            <DialogDescription className="text-center text-base">
              {userToDelete && (
                <>
                  Estás a punto de eliminar a <strong>{userToDelete.name}</strong>.
                  Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación general */}
      <ConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={confirmModalProps.title}
        description={confirmModalProps.description}
        type={confirmModalProps.type}
      />
    </div>
  );
}
