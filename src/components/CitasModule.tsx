import { useState, useEffect } from 'react';
import { Appointment } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Calendar, Clock, Plus, Phone, User } from 'lucide-react';
import { getAppointments, addAppointment, updateAppointment } from '../utils/database';

const STYLISTS = ['Ana Martínez', 'Laura Pérez', 'Sofía Rodríguez', 'Carmen López'];
const SERVICES = ['Corte de Cabello', 'Tinte Completo', 'Mechas', 'Peinado', 'Manicure', 'Pedicure'];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00'
];

export function CitasModule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Formulario
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    services: [] as string[],
    stylist: '',
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const loaded = await getAppointments();
      setAppointments(loaded);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newAppointment: Appointment = {
        id: `A-${Date.now()}`,
        ...formData,
        status: 'pendiente',
      };

      await addAppointment(newAppointment);
      await loadAppointments();
      setIsDialogOpen(false);
      setFormData({
        clientName: '',
        clientPhone: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        services: [],
        stylist: '',
      });
    } catch (error) {
      console.error('Error al crear cita:', error);
    }
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      const appointment = appointments.find((apt) => apt.id === id);
      if (appointment) {
        await updateAppointment({ ...appointment, status });
        await loadAppointments();
      }
    } catch (error) {
      console.error('Error al actualizar estado de cita:', error);
    }
  };

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const filteredAppointments = appointments
    .filter((apt) => apt.date === filterDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getStatusBadge = (status: Appointment['status']) => {
    const variants = {
      pendiente: 'default',
      completada: 'default',
      cancelada: 'destructive',
    } as const;

    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: '',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="filterDate">Fecha</Label>
            <Input
              id="filterDate"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agendar Nueva Cita</DialogTitle>
              <DialogDescription>
                Completa la información del cliente y los servicios solicitados
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nombre del Cliente</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Teléfono</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, clientPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Select value={formData.time} onValueChange={(v) => setFormData({ ...formData, time: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Servicios</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map((service) => (
                    <Button
                      key={service}
                      type="button"
                      variant={formData.services.includes(service) ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => toggleService(service)}
                    >
                      {service}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stylist">Estilista</Label>
                <Select value={formData.stylist} onValueChange={(v) => setFormData({ ...formData, stylist: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estilista" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLISTS.map((stylist) => (
                      <SelectItem key={stylist} value={stylist}>
                        {stylist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={formData.services.length === 0 || !formData.stylist}>
                Agendar Cita
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Citas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAppointments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay citas programadas para esta fecha
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{appointment.clientName}</CardTitle>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4" />
                  {appointment.clientPhone}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  {new Date(appointment.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  {appointment.time}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" />
                  {appointment.stylist}
                </div>

                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">Servicios:</p>
                  <div className="flex flex-wrap gap-1">
                    {appointment.services.map((service, idx) => (
                      <Badge key={idx} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                {appointment.status === 'pendiente' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(appointment.id, 'completada')}
                    >
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => updateStatus(appointment.id, 'cancelada')}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}