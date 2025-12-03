// Utilidad para generar datos de ejemplo para el sistema
export function generateSampleData() {
  // Crear usuarios de ejemplo si no existen
  const existingUsers = localStorage.getItem('users');
  if (!existingUsers) {
    const sampleUsers = [
      {
        id: '1',
        name: 'Admin Principal',
        username: 'admin',
        password: 'admin123',
        role: 'admin' as const,
      },
      {
        id: '2',
        name: 'María González',
        username: 'maria',
        password: 'maria123',
        role: 'cajero' as const,
      },
      {
        id: '3',
        name: 'Pedro Ramírez',
        username: 'pedro',
        password: 'pedro123',
        role: 'cajero' as const,
      },
    ];
    localStorage.setItem('users', JSON.stringify(sampleUsers));
  }

  // Generar transacciones de ejemplo con diferentes métodos de pago
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Generar datos para las últimas 4 semanas
  const sampleTransactions = [];
  
  for (let week = 0; week < 4; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (week * 7 + day));
      
      // Generar entre 3-8 transacciones por día
      const numTransactions = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < numTransactions; i++) {
        const transactionDate = new Date(date);
        transactionDate.setHours(9 + Math.floor(Math.random() * 10)); // Entre 9am y 7pm
        transactionDate.setMinutes(Math.floor(Math.random() * 60));
        
        // Tipos de pago aleatorios
        const paymentTypes = ['efectivo', 'tarjeta', 'transferencia', 'mixto'];
        const paymentMethod = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
        
        // Generar monto total aleatorio
        const total = Math.floor(Math.random() * 800000) + 100000; // Entre 100.000 y 900.000
        
        const transaction: any = {
          id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cashRegisterId: 'sample-register',
          date: transactionDate.toISOString(),
          type: Math.random() > 0.5 ? 'servicio' : 'producto',
          items: [
            {
              id: `item-${i}`,
              name: Math.random() > 0.5 ? 'Corte de Cabello' : 'Shampoo Premium',
              price: total,
              quantity: 1,
              stylist: Math.random() > 0.5 ? 'Ana Martínez' : undefined,
            },
          ],
          total,
          paymentMethod,
          status: 'activa',
        };
        
        // Si es pago mixto, agregar detalles
        if (paymentMethod === 'mixto') {
          const efectivo = Math.floor(total * (Math.random() * 0.4 + 0.2)); // 20-60% efectivo
          const tarjeta = Math.floor(total * (Math.random() * 0.3 + 0.1)); // 10-40% tarjeta
          const transferencia = total - efectivo - tarjeta; // El resto
          
          transaction.paymentDetails = {
            efectivo,
            tarjeta,
            transferencia,
          };
        }
        
        sampleTransactions.push(transaction);
      }
    }
  }
  
  return sampleTransactions;
}

// Función para limpiar datos de ejemplo
export function clearSampleData() {
  localStorage.removeItem('cashRegisterHistory');
  localStorage.removeItem('anulledTransactions');
  // No limpiar usuarios para mantener los logins
}
