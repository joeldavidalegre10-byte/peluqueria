import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Palette, Sun, Moon, Waves, Settings } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

type Theme = 'light' | 'dark' | 'ocean';

export function CashierConfigModule() {
  const [theme, setTheme] = useState<Theme>('light');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    loadTheme();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="size-8 text-blue-600" />
        <div>
          <h2 className="text-2xl">Configuración</h2>
          <p className="text-muted-foreground">Personaliza la apariencia del sistema</p>
        </div>
      </div>

      <div className="max-w-2xl">
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
