import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DollarSign, TrendingUp, ShoppingBag, Users, Calendar, Download, Package, Scissors, FileText } from 'lucide-react';
import { formatGuaranies } from '../utils/currency';
import { getTransactions, getCashRegisterHistory } from '../utils/database';
import jsPDF from 'jspdf';

export function ReportsModule() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);

  useEffect(() => {
    // Cargar datos desde IndexedDB
    const loadData = async () => {
      const [allTransactions, history] = await Promise.all([
        getTransactions(),
        getCashRegisterHistory(),
      ]);
      
      setTransactions(allTransactions.filter(t => t.status === 'activa'));
      setCashRegisters(history);
    };
    
    loadData();
  }, []);

  // Filtrar transacciones por rango de fechas
  const filteredTransactions = transactions.filter((t) => {
    const tDate = t.date.split('T')[0];
    return tDate >= startDate && tDate <= endDate;
  });

  // Cálculos generales
  const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = filteredTransactions.length;

  // Por método de pago - incluye manejo de pagos mixtos
  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;

  filteredTransactions.forEach((t) => {
    if (t.paymentMethod === 'mixto' && t.paymentDetails) {
      // Para pagos mixtos, sumar cada método por separado
      cashSales += t.paymentDetails.efectivo || 0;
      cardSales += t.paymentDetails.tarjeta || 0;
      transferSales += t.paymentDetails.transferencia || 0;
    } else {
      // Para pagos simples
      if (t.paymentMethod === 'efectivo') cashSales += t.total;
      if (t.paymentMethod === 'tarjeta') cardSales += t.total;
      if (t.paymentMethod === 'transferencia') transferSales += t.total;
    }
  });

  // Por tipo
  const servicesSales = filteredTransactions
    .filter((t) => t.type === 'servicio')
    .reduce((sum, t) => sum + t.total, 0);
  const productsSales = filteredTransactions
    .filter((t) => t.type === 'producto')
    .reduce((sum, t) => sum + t.total, 0);

  // Exportar reporte
  const exportReport = () => {
    const reportData = {
      periodo: `${startDate} a ${endDate}`,
      resumen: {
        ventasTotales: totalSales,
        totalTransacciones: totalTransactions,
        ticketPromedio: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
      porMetodoPago: {
        efectivo: cashSales,
        tarjeta: cardSales,
        transferencia: transferSales,
      },
      porTipo: {
        servicios: servicesSales,
        productos: productsSales,
      },
      topProductos: topProducts,
      topEstilistas: topStylists,
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${startDate}_${endDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Productos más vendidos
  const productSalesMap: { [key: string]: { name: string; quantity: number; total: number } } = {};
  filteredTransactions.forEach((t) => {
    t.items.forEach((item: any) => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, quantity: 0, total: 0 };
      }
      productSalesMap[item.name].quantity += item.quantity;
      productSalesMap[item.name].total += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Estilistas más productivos (solo servicios)
  const stylistSalesMap: { [key: string]: { name: string; services: number; total: number } } = {};
  filteredTransactions
    .filter((t) => t.type === 'servicio')
    .forEach((t) => {
      t.items.forEach((item: any) => {
        if (item.stylist) {
          if (!stylistSalesMap[item.stylist]) {
            stylistSalesMap[item.stylist] = { name: item.stylist, services: 0, total: 0 };
          }
          stylistSalesMap[item.stylist].services += 1;
          stylistSalesMap[item.stylist].total += item.price * item.quantity;
        }
      });
    });
  const topStylists = Object.values(stylistSalesMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Ventas por día
  const salesByDay: { [key: string]: number } = {};
  filteredTransactions.forEach((t) => {
    const day = t.date.split('T')[0];
    if (!salesByDay[day]) {
      salesByDay[day] = 0;
    }
    salesByDay[day] += t.total;
  });
  const dailySales = Object.entries(salesByDay)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Ventas por semana
  const salesByWeek: { [key: string]: { total: number; transactions: number; startDate: string; endDate: string } } = {};
  
  filteredTransactions.forEach((t) => {
    const date = new Date(t.date);
    // Obtener el lunes de esa semana
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    // Obtener el domingo de esa semana
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!salesByWeek[weekKey]) {
      salesByWeek[weekKey] = {
        total: 0,
        transactions: 0,
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
      };
    }
    
    salesByWeek[weekKey].total += t.total;
    salesByWeek[weekKey].transactions += 1;
  });
  
  const weeklySales = Object.values(salesByWeek)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-6">
      {/* Filtros de Fecha */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reportes Financieros</CardTitle>
          <Button onClick={exportReport} variant="outline">
            <Download className="size-4 mr-2" />
            Exportar Reporte
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(end.toISOString().split('T')[0]);
              }}
            >
              Últimos 30 días
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-secondary p-2 rounded-full">
                <DollarSign className="size-5 text-green-600 dark:text-green-400 ocean:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Totales</p>
                <p className="text-lg font-semibold">₲ {formatGuaranies(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-secondary p-2 rounded-full">
                <ShoppingBag className="size-5 text-blue-600 dark:text-blue-400 ocean:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transacciones</p>
                <p className="text-lg font-semibold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-secondary p-2 rounded-full">
                <TrendingUp className="size-5 text-purple-600 dark:text-purple-400 ocean:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Promedio</p>
                <p className="text-lg font-semibold">
                  ₲ {totalTransactions > 0 ? formatGuaranies(totalSales / totalTransactions) : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-secondary p-2 rounded-full">
                <Calendar className="size-5 text-orange-600 dark:text-orange-400 ocean:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Días Activos</p>
                <p className="text-lg font-semibold">{cashRegisters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalles */}
      <Tabs defaultValue="payment">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 h-auto">
            <TabsTrigger value="payment" className="text-xs whitespace-nowrap px-2 sm:px-3">
              <span className="hidden sm:inline">Por Método de Pago</span>
              <span className="sm:hidden">Método Pago</span>
            </TabsTrigger>
            <TabsTrigger value="type" className="text-xs whitespace-nowrap px-2 sm:px-3">
              <span className="hidden sm:inline">Por Tipo</span>
              <span className="sm:hidden">Tipo</span>
            </TabsTrigger>
            <TabsTrigger value="stylists" className="text-xs whitespace-nowrap px-2 sm:px-3">
              <span className="hidden sm:inline">Estilistas</span>
              <span className="sm:hidden">Estilistas</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs whitespace-nowrap px-2 sm:px-3">
              <span className="hidden sm:inline">Ventas Diarias</span>
              <span className="sm:hidden">Diarias</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs whitespace-nowrap px-2 sm:px-3">
              <span className="hidden sm:inline">Ventas Semanales</span>
              <span className="sm:hidden">Semanales</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg gap-2">
                  <div>
                    <p>Efectivo</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.filter((t) => t.paymentMethod === 'efectivo').length}{' '}
                      transacciones directas
                      {filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo).length > 0 && 
                        ` + ${filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo).length} mixtas`}
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl text-green-600">₲ {formatGuaranies(cashSales)}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg gap-2">
                  <div>
                    <p>Tarjeta</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.filter((t) => t.paymentMethod === 'tarjeta').length}{' '}
                      transacciones directas
                      {filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.tarjeta).length > 0 && 
                        ` + ${filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.tarjeta).length} mixtas`}
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl text-green-600">₲ {formatGuaranies(cardSales)}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg gap-2">
                  <div>
                    <p>Transferencia</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.filter((t) => t.paymentMethod === 'transferencia').length}{' '}
                      transacciones directas
                      {filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.transferencia).length > 0 && 
                        ` + ${filteredTransactions.filter((t) => t.paymentMethod === 'mixto' && t.paymentDetails?.transferencia).length} mixtas`}
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl text-green-600">₲ {formatGuaranies(transferSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="type" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg gap-2">
                  <div>
                    <p>Servicios</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.filter((t) => t.type === 'servicio').length} transacciones
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl text-green-600">₲ {formatGuaranies(servicesSales)}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg gap-2">
                  <div>
                    <p>Productos</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.filter((t) => t.type === 'producto').length} transacciones
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl text-green-600">₲ {formatGuaranies(productsSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="stylists" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Estilistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStylists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay datos disponibles</p>
                ) : (
                  topStylists.map((stylist, idx) => (
                    <div key={stylist.name} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                      <div className="bg-blue-100 text-blue-600 rounded-full size-8 flex items-center justify-center">
                        <Users className="size-4" />
                      </div>
                      <div className="flex-1">
                        <p>{stylist.name}</p>
                        <p className="text-sm text-muted-foreground">{stylist.services} servicios realizados</p>
                      </div>
                      <p className="text-base sm:text-lg text-green-600">₲ {formatGuaranies(stylist.total)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Día</CardTitle>
            </CardHeader>
            <CardContent>
              {dailySales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay datos disponibles</p>
              ) : (
                <div className="space-y-6">
                  {dailySales.map((day) => {
                    const dayTransactions = filteredTransactions.filter(t => t.date.startsWith(day.date));
                    
                    // Agrupar items de todas las transacciones del día
                    const allItems: any[] = [];
                    dayTransactions.forEach(t => {
                      t.items.forEach((item: any) => {
                        allItems.push({
                          ...item,
                          transactionId: t.id,
                          type: t.type,
                        });
                      });
                    });

                    return (
                      <div key={day.date} className="border rounded-lg overflow-hidden">
                        {/* Header del día */}
                        <div className="flex items-center justify-between p-4 bg-secondary border-b">
                          <div>
                            <p className="font-semibold">{new Date(day.date).toLocaleDateString('es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}</p>
                            <p className="text-sm text-muted-foreground">
                              {dayTransactions.length} transacciones • {allItems.length} items
                            </p>
                          </div>
                          <p className="text-2xl text-green-600">₲ {formatGuaranies(day.total)}</p>
                        </div>

                        {/* Tabs para filtrar */}
                        <Tabs defaultValue="all" className="p-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">Todo ({allItems.length})</TabsTrigger>
                            <TabsTrigger value="services">
                              Servicios ({allItems.filter(i => i.type === 'servicio').length})
                            </TabsTrigger>
                            <TabsTrigger value="products">
                              Productos ({allItems.filter(i => i.type === 'producto').length})
                            </TabsTrigger>
                          </TabsList>

                          {/* Todo */}
                          <TabsContent value="all" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Badge variant={item.type === 'servicio' ? 'default' : 'secondary'}>
                                        {item.type === 'servicio' ? (
                                          <><Scissors className="size-3 mr-1" /> Servicio</>
                                        ) : (
                                          <><Package className="size-3 mr-1" /> Producto</>
                                        )}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <p>{item.name}</p>
                                        {item.stylist && (
                                          <p className="text-sm text-muted-foreground">Estilista: {item.stylist}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                      ₲ {formatGuaranies(item.price * item.quantity)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* Servicios */}
                          <TabsContent value="services" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Estilista</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.filter(i => i.type === 'servicio').length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                      No hay servicios registrados en este día
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  allItems.filter(i => i.type === 'servicio').map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>{item.stylist || '-'}</TableCell>
                                      <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        ₲ {formatGuaranies(item.price * item.quantity)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* Productos */}
                          <TabsContent value="products" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.filter(i => i.type === 'producto').length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                      No hay productos registrados en este día
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  allItems.filter(i => i.type === 'producto').map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        ₲ {formatGuaranies(item.price * item.quantity)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TabsContent>
                        </Tabs>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklySales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay datos disponibles</p>
              ) : (
                <div className="space-y-6">
                  {weeklySales.map((week) => {
                    const startDate = new Date(week.startDate);
                    const endDate = new Date(week.endDate);
                    const avgPerDay = week.total / 7;
                    
                    // Obtener todas las transacciones de esta semana
                    const weekTransactions = filteredTransactions.filter(t => {
                      const tDate = new Date(t.date);
                      const start = new Date(week.startDate);
                      const end = new Date(week.endDate);
                      return tDate >= start && tDate <= end;
                    });

                    // Agrupar items de todas las transacciones de la semana
                    const allItems: any[] = [];
                    weekTransactions.forEach(t => {
                      t.items.forEach((item: any) => {
                        allItems.push({
                          ...item,
                          transactionId: t.id,
                          type: t.type,
                        });
                      });
                    });
                    
                    return (
                      <div key={week.startDate} className="border rounded-lg overflow-hidden">
                        {/* Header de la semana */}
                        <div className="p-4 bg-secondary border-b space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">
                                Semana del {startDate.toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                })} al {endDate.toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {week.transactions} transacciones • {allItems.length} items
                              </p>
                            </div>
                            <p className="text-2xl text-green-600">₲ {formatGuaranies(week.total)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Promedio por día</p>
                              <p className="text-lg">₲ {formatGuaranies(avgPerDay)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Promedio por transacción</p>
                              <p className="text-lg">
                                ₲ {formatGuaranies(week.total / week.transactions)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tabs para filtrar */}
                        <Tabs defaultValue="all" className="p-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">Todo ({allItems.length})</TabsTrigger>
                            <TabsTrigger value="services">
                              Servicios ({allItems.filter(i => i.type === 'servicio').length})
                            </TabsTrigger>
                            <TabsTrigger value="products">
                              Productos ({allItems.filter(i => i.type === 'producto').length})
                            </TabsTrigger>
                          </TabsList>

                          {/* Todo */}
                          <TabsContent value="all" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Badge variant={item.type === 'servicio' ? 'default' : 'secondary'}>
                                        {item.type === 'servicio' ? (
                                          <><Scissors className="size-3 mr-1" /> Servicio</>
                                        ) : (
                                          <><Package className="size-3 mr-1" /> Producto</>
                                        )}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <p>{item.name}</p>
                                        {item.stylist && (
                                          <p className="text-sm text-muted-foreground">Estilista: {item.stylist}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                      ₲ {formatGuaranies(item.price * item.quantity)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* Servicios */}
                          <TabsContent value="services" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Estilista</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.filter(i => i.type === 'servicio').length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                      No hay servicios registrados en esta semana
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  allItems.filter(i => i.type === 'servicio').map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>{item.stylist || '-'}</TableCell>
                                      <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        ₲ {formatGuaranies(item.price * item.quantity)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* Productos */}
                          <TabsContent value="products" className="mt-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Precio Unit.</TableHead>
                                  <TableHead>Cant.</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.filter(i => i.type === 'producto').length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                      No hay productos registrados en esta semana
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  allItems.filter(i => i.type === 'producto').map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        ₲ {formatGuaranies(item.price * item.quantity)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TabsContent>
                        </Tabs>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}