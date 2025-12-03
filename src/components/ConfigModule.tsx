import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Settings, Key, Palette, Sun, Moon, Waves } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { getUsers, updateUser } from '../utils/database';

type Theme = 'light' | 'dark' | 'ocean';

export function ConfigModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    loadUsers();
    loadTheme();
  }, []);

  const loadUsers = async () => {
    try {
      const loaded = await getUsers();
      setUsers(loaded);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('salon-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  };

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remover todas las clases de tema
    root.classList.remove('light', 'dark', 'ocean');
    
    // Agregar la nueva clase de tema
    root.classList.add(newTheme);
    
    // Guardar en localStorage
    localStorage.setItem('salon-theme', newTheme);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    setConfirmModalProps({
      title: '¡Tema Cambiado!',
      description: `El tema ha sido cambiado a ${getThemeName(newTheme)} exitosamente`,
      type: 'success',
    });
    setShowConfirmModal(true);
  };

  const getThemeName = (theme: Theme): string => {
    switch (theme) {
      case 'light':
        return 'Modo Claro';
      case 'dark':
        return 'Modo Nocturno';
      case 'ocean':
        return 'Modo Oceánico';
      default:
        return '';
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) {
      setConfirmModalProps({
        title: 'Seleccione un Usuario',
        description: 'Por favor seleccione el usuario al que desea restablecer la contraseña',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setConfirmModalProps({
        title: 'Campos Incompletos',
        description: 'Por favor complete todos los campos de contraseña',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmModalProps({
        title: 'Contraseñas No Coinciden',
        description: 'Las contraseñas ingresadas no coinciden. Por favor verifique',
        type: 'error',
      });
      setShowConfirmModal(true);
      return;
    }

    if (newPassword.length < 4) {
      setConfirmModalProps({
        title: 'Contraseña Muy Corta',
        description: 'La contraseña debe tener al menos 4 caracteres',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        const updatedUser = { ...user, password: newPassword };
        await updateUser(updatedUser);
        
        setConfirmModalProps({
          title: '¡Contraseña Restablecida!',
          description: `La contraseña de ${user.name} ha sido restablecida exitosamente`,
          type: 'success',
        });
        setShowConfirmModal(true);
        
        // Limpiar formulario
        setSelectedUserId('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'Hubo un error al restablecer la contraseña',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="size-8 text-blue-600" />
        <div>
          <h2 className="text-2xl">Configuración del Sistema</h2>
          <p className="text-muted-foreground">Personaliza y administra las configuraciones generales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restablecer Contraseña */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-secondary p-3 rounded-full">
                <Key className="size-6 text-orange-600 dark:text-orange-400 ocean:text-orange-400" />
              </div>
              <div>
                <CardTitle>Restablecer Contraseña</CardTitle>
                <CardDescription>Cambia la contraseña de cualquier usuario del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Seleccionar Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Selecciona un usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} (@{user.username}) - {user.role === 'admin' ? 'Administrador' : 'Cajero'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Ingrese la nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirme la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleResetPassword} 
              className="w-full"
              disabled={!selectedUserId || !newPassword || !confirmPassword}
            >
              <Key className="size-4 mr-2" />
              Restablecer Contraseña
            </Button>
          </CardContent>
        </Card>

        {/* Selector de Tema */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-secondary p-3 rounded-full">
                <Palette className="size-6 text-purple-600 dark:text-purple-400 ocean:text-purple-400" />
              </div>
              <div>
                <CardTitle>Tema de la Aplicación</CardTitle>
                <CardDescription>Personaliza la apariencia del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Modo Claro */}
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  theme === 'light' 
                    ? 'border-blue-600 bg-secondary' 
                    : 'border-border hover:border-primary bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-secondary p-3 rounded-full shadow-sm">
                    <Sun className="size-6 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Modo Claro</p>
                    <p className="text-sm text-muted-foreground">Interfaz brillante y moderna</p>
                  </div>
                  {theme === 'light' && (
                    <div className="size-4 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>

              {/* Modo Nocturno */}
              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  theme === 'dark' 
                    ? 'border-blue-600 bg-secondary' 
                    : 'border-border hover:border-primary bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-secondary p-3 rounded-full shadow-sm">
                    <Moon className="size-6 text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Modo Nocturno</p>
                    <p className="text-sm text-muted-foreground">Ideal para ambientes oscuros</p>
                  </div>
                  {theme === 'dark' && (
                    <div className="size-4 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>

              {/* Modo Oceánico */}
              <button
                onClick={() => handleThemeChange('ocean')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  theme === 'ocean' 
                    ? 'border-blue-600 bg-secondary' 
                    : 'border-border hover:border-primary bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-secondary p-3 rounded-full shadow-sm">
                    <Waves className="size-6 text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Modo Oceánico</p>
                    <p className="text-sm text-muted-foreground">Elegante y profesional</p>
                  </div>
                  {theme === 'ocean' && (
                    <div className="size-4 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                El tema seleccionado se aplicará en toda la aplicación y se guardará para futuras sesiones.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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