import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Scissors, Lock, User as UserIcon } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { db, getUserByUsername, initializeSampleData } from '../utils/database';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'error' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    // Inicializar la base de datos y migrar datos si es necesario
    const initDB = async () => {
      await db.init();
      
      // Intentar migrar datos de localStorage si existen
      const hasLocalStorageData = localStorage.getItem('users');
      if (hasLocalStorageData) {
        await db.migrateFromLocalStorage();
      } else {
        // Inicializar datos de ejemplo
        await initializeSampleData();
      }
    };
    
    initDB();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor ingrese usuario y contraseña',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      const user = await getUserByUsername(username);

      if (user && user.password === password) {
        onLogin(user);
      } else {
        setConfirmModalProps({
          title: 'Error de Autenticación',
          description: 'Usuario o contraseña incorrectos',
          type: 'error',
        });
        setShowConfirmModal(true);
      }
    } catch (error) {
      setConfirmModalProps({
        title: 'Error de Sistema',
        description: 'Error al verificar credenciales',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-pink-100 p-4 rounded-full">
              <Scissors className="size-12 text-pink-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">Salón de Belleza</CardTitle>
          <CardDescription>Sistema de Gestión Integral</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Ingresar al Sistema
            </Button>
          </form>
        </CardContent>
      </Card>

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
