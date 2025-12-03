import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DollarSign } from 'lucide-react';

interface AperturaCajaProps {
  onOpen: (openingAmount: number) => void;
}

export function AperturaCaja({ onOpen }: AperturaCajaProps) {
  const [openingAmount, setOpeningAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingAmount);
    if (amount >= 0) {
      onOpen(amount);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-secondary p-4 rounded-full">
              <DollarSign className="size-8 text-green-600 dark:text-green-400 ocean:text-green-400" />
            </div>
          </div>
          <CardTitle>Apertura de Caja</CardTitle>
          <CardDescription>
            Ingresa el monto inicial de efectivo con el que comienzas el día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="openingAmount">Monto Inicial (Fondo de Cambio)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="openingAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Ejemplo: Si comienzas con $50 en efectivo para dar cambio
              </p>
            </div>

            <div className="bg-secondary border p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Información:</strong> Este monto será el fondo de cambio para el día. 
                Al cierre de caja, el sistema verificará que el efectivo físico coincida con 
                este monto inicial más los ingresos en efectivo del día.
              </p>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Abrir Caja
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}