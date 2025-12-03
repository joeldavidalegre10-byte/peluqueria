// Capa de abstracción de IndexedDB para el sistema de gestión de salón
import { User, CashRegister, Transaction, Product, Service, Appointment, MiscItem } from '../App';

const DB_NAME = 'SalonBellezaDB';
const DB_VERSION = 2; // Incrementamos la versión para agregar el nuevo store

// Nombres de los object stores
export const STORES = {
  USERS: 'users',
  CASH_REGISTERS: 'cashRegisters',
  TRANSACTIONS: 'transactions',
  PRODUCTS: 'products',
  SERVICES: 'services',
  APPOINTMENTS: 'appointments',
  ANULLED_TRANSACTIONS: 'anulledTransactions',
  CASH_REGISTER_HISTORY: 'cashRegisterHistory',
  MISC_ITEMS: 'miscItems',
};

class DatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializada correctamente');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Crear object stores si no existen
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        if (!db.objectStoreNames.contains(STORES.CASH_REGISTERS)) {
          const cashRegisterStore = db.createObjectStore(STORES.CASH_REGISTERS, { keyPath: 'id' });
          cashRegisterStore.createIndex('userId', 'userId', { unique: false });
          cashRegisterStore.createIndex('status', 'status', { unique: false });
          cashRegisterStore.createIndex('openingDate', 'openingDate', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
          const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
          transactionStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });
          transactionStore.createIndex('date', 'date', { unique: false });
          transactionStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SERVICES)) {
          db.createObjectStore(STORES.SERVICES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.APPOINTMENTS)) {
          const appointmentStore = db.createObjectStore(STORES.APPOINTMENTS, { keyPath: 'id' });
          appointmentStore.createIndex('date', 'date', { unique: false });
          appointmentStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ANULLED_TRANSACTIONS)) {
          const anulledStore = db.createObjectStore(STORES.ANULLED_TRANSACTIONS, { keyPath: 'id' });
          anulledStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CASH_REGISTER_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.CASH_REGISTER_HISTORY, { keyPath: 'id' });
          historyStore.createIndex('closingDate', 'closingDate', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.MISC_ITEMS)) {
          db.createObjectStore(STORES.MISC_ITEMS, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  // Métodos genéricos CRUD
  async add<T>(storeName: string, data: T): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Métodos específicos con índices
  async getAllByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByRange<T>(
    storeName: string,
    indexName: string,
    lowerBound: any,
    upperBound: any
  ): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const range = IDBKeyRange.bound(lowerBound, upperBound);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Migración de localStorage a IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    console.log('Iniciando migración de localStorage a IndexedDB...');

    try {
      // Migrar usuarios
      const usersData = localStorage.getItem('users');
      if (usersData) {
        const users = JSON.parse(usersData);
        for (const user of users) {
          await this.put(STORES.USERS, user);
        }
        console.log(`✓ Migrados ${users.length} usuarios`);
      }

      // Migrar productos
      const productsData = localStorage.getItem('products');
      if (productsData) {
        const products = JSON.parse(productsData);
        for (const product of products) {
          await this.put(STORES.PRODUCTS, product);
        }
        console.log(`✓ Migrados ${products.length} productos`);
      }

      // Migrar servicios
      const servicesData = localStorage.getItem('services');
      if (servicesData) {
        const services = JSON.parse(servicesData);
        for (const service of services) {
          await this.put(STORES.SERVICES, service);
        }
        console.log(`✓ Migrados ${services.length} servicios`);
      }

      // Migrar citas
      const appointmentsData = localStorage.getItem('appointments');
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        for (const appointment of appointments) {
          await this.put(STORES.APPOINTMENTS, appointment);
        }
        console.log(`✓ Migradas ${appointments.length} citas`);
      }

      // Migrar cajas registradoras
      const cashRegistersData = localStorage.getItem('cashRegisters');
      if (cashRegistersData) {
        const cashRegisters = JSON.parse(cashRegistersData);
        for (const cashRegister of cashRegisters) {
          await this.put(STORES.CASH_REGISTERS, cashRegister);
        }
        console.log(`✓ Migradas ${cashRegisters.length} cajas registradoras`);
      }

      // Migrar historial de cajas
      const historyData = localStorage.getItem('cashRegisterHistory');
      if (historyData) {
        const history = JSON.parse(historyData);
        for (const record of history) {
          await this.put(STORES.CASH_REGISTER_HISTORY, record);
        }
        console.log(`✓ Migrados ${history.length} registros de historial`);
      }

      // Migrar transacciones anuladas
      const anulledData = localStorage.getItem('anulledTransactions');
      if (anulledData) {
        const anulled = JSON.parse(anulledData);
        for (const transaction of anulled) {
          await this.put(STORES.ANULLED_TRANSACTIONS, transaction);
        }
        console.log(`✓ Migradas ${anulled.length} transacciones anuladas`);
      }

      // Migrar todas las transacciones de diferentes cajas
      const allKeys = Object.keys(localStorage);
      const transactionKeys = allKeys.filter(key => key.startsWith('transactions-'));
      let totalTransactions = 0;

      for (const key of transactionKeys) {
        const transactionsData = localStorage.getItem(key);
        if (transactionsData) {
          const transactions = JSON.parse(transactionsData);
          for (const transaction of transactions) {
            await this.put(STORES.TRANSACTIONS, transaction);
            totalTransactions++;
          }
        }
      }
      
      if (totalTransactions > 0) {
        console.log(`✓ Migradas ${totalTransactions} transacciones`);
      }

      console.log('✅ Migración completada exitosamente');
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      throw error;
    }
  }
}

// Exportar instancia única
export const db = new DatabaseService();

// Funciones helper específicas para cada entidad

// Usuarios
export async function getUsers(): Promise<User[]> {
  return db.getAll<User>(STORES.USERS);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return db.getByIndex<User>(STORES.USERS, 'username', username);
}

export async function addUser(user: User): Promise<User> {
  return db.add<User>(STORES.USERS, user);
}

export async function updateUser(user: User): Promise<User> {
  return db.put<User>(STORES.USERS, user);
}

export async function deleteUser(id: string): Promise<void> {
  return db.delete(STORES.USERS, id);
}

// Cajas registradoras
export async function getCashRegisters(): Promise<CashRegister[]> {
  return db.getAll<CashRegister>(STORES.CASH_REGISTERS);
}

export async function getCashRegistersByStatus(status: string): Promise<CashRegister[]> {
  return db.getAllByIndex<CashRegister>(STORES.CASH_REGISTERS, 'status', status);
}

export async function getCashRegistersByUser(userId: string): Promise<CashRegister[]> {
  return db.getAllByIndex<CashRegister>(STORES.CASH_REGISTERS, 'userId', userId);
}

export async function addCashRegister(cashRegister: CashRegister): Promise<CashRegister> {
  return db.add<CashRegister>(STORES.CASH_REGISTERS, cashRegister);
}

export async function updateCashRegister(cashRegister: CashRegister): Promise<CashRegister> {
  return db.put<CashRegister>(STORES.CASH_REGISTERS, cashRegister);
}

// Transacciones
export async function getTransactions(): Promise<Transaction[]> {
  return db.getAll<Transaction>(STORES.TRANSACTIONS);
}

export async function getTransactionsByCashRegister(cashRegisterId: string): Promise<Transaction[]> {
  return db.getAllByIndex<Transaction>(STORES.TRANSACTIONS, 'cashRegisterId', cashRegisterId);
}

export async function getTransactionsByStatus(status: string): Promise<Transaction[]> {
  return db.getAllByIndex<Transaction>(STORES.TRANSACTIONS, 'status', status);
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  return db.getAllByRange<Transaction>(STORES.TRANSACTIONS, 'date', startDate, endDate);
}

export async function addTransaction(transaction: Transaction): Promise<Transaction> {
  return db.add<Transaction>(STORES.TRANSACTIONS, transaction);
}

export async function updateTransaction(transaction: Transaction): Promise<Transaction> {
  return db.put<Transaction>(STORES.TRANSACTIONS, transaction);
}

// Productos
export async function getProducts(): Promise<Product[]> {
  return db.getAll<Product>(STORES.PRODUCTS);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return db.getAllByIndex<Product>(STORES.PRODUCTS, 'category', category);
}

export async function addProduct(product: Product): Promise<Product> {
  return db.add<Product>(STORES.PRODUCTS, product);
}

export async function updateProduct(product: Product): Promise<Product> {
  return db.put<Product>(STORES.PRODUCTS, product);
}

export async function deleteProduct(id: string): Promise<void> {
  return db.delete(STORES.PRODUCTS, id);
}

// Servicios
export async function getServices(): Promise<Service[]> {
  return db.getAll<Service>(STORES.SERVICES);
}

export async function addService(service: Service): Promise<Service> {
  return db.add<Service>(STORES.SERVICES, service);
}

export async function updateService(service: Service): Promise<Service> {
  return db.put<Service>(STORES.SERVICES, service);
}

export async function deleteService(id: string): Promise<void> {
  return db.delete(STORES.SERVICES, id);
}

// Citas
export async function getAppointments(): Promise<Appointment[]> {
  return db.getAll<Appointment>(STORES.APPOINTMENTS);
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return db.getAllByIndex<Appointment>(STORES.APPOINTMENTS, 'date', date);
}

export async function getAppointmentsByStatus(status: string): Promise<Appointment[]> {
  return db.getAllByIndex<Appointment>(STORES.APPOINTMENTS, 'status', status);
}

export async function addAppointment(appointment: Appointment): Promise<Appointment> {
  return db.add<Appointment>(STORES.APPOINTMENTS, appointment);
}

export async function updateAppointment(appointment: Appointment): Promise<Appointment> {
  return db.put<Appointment>(STORES.APPOINTMENTS, appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
  return db.delete(STORES.APPOINTMENTS, id);
}

// Transacciones anuladas
export async function getAnulledTransactions(): Promise<Transaction[]> {
  return db.getAll<Transaction>(STORES.ANULLED_TRANSACTIONS);
}

export async function addAnulledTransaction(transaction: Transaction): Promise<Transaction> {
  return db.add<Transaction>(STORES.ANULLED_TRANSACTIONS, transaction);
}

// Historial de cajas
export async function getCashRegisterHistory(): Promise<CashRegister[]> {
  return db.getAll<CashRegister>(STORES.CASH_REGISTER_HISTORY);
}

export async function addCashRegisterHistory(cashRegister: CashRegister): Promise<CashRegister> {
  return db.add<CashRegister>(STORES.CASH_REGISTER_HISTORY, cashRegister);
}

// Inicializar datos de ejemplo
export async function initializeSampleData(): Promise<void> {
  const users = await getUsers();
  
  if (users.length === 0) {
    const sampleUsers: User[] = [
      {
        id: '1',
        name: 'Admin Principal',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
      },
      {
        id: '2',
        name: 'María González',
        username: 'maria',
        password: 'maria123',
        role: 'cajero',
      },
      {
        id: '3',
        name: 'Pedro Ramírez',
        username: 'pedro',
        password: 'pedro123',
        role: 'cajero',
      },
    ];

    for (const user of sampleUsers) {
      await addUser(user);
    }
    console.log('✓ Usuarios de ejemplo creados');
  }

  // Inicializar productos de ejemplo si no existen
  const products = await getProducts();
  if (products.length === 0) {
    const sampleProducts: Product[] = [
      { id: 'P1', name: 'Shampoo Premium', price: 110000, stock: 25, minStock: 5, category: 'Cuidado Capilar' },
      { id: 'P2', name: 'Acondicionador', price: 95000, stock: 20, minStock: 5, category: 'Cuidado Capilar' },
      { id: 'P3', name: 'Mascarilla Reparadora', price: 150000, stock: 15, minStock: 3, category: 'Cuidado Capilar' },
      { id: 'P4', name: 'Spray Fijador', price: 70000, stock: 30, minStock: 8, category: 'Styling' },
      { id: 'P5', name: 'Aceite Capilar', price: 130000, stock: 12, minStock: 4, category: 'Cuidado Capilar' },
      { id: 'P6', name: 'Esmalte de Uñas', price: 50000, stock: 50, minStock: 10, category: 'Manicure' },
    ];

    for (const product of sampleProducts) {
      await addProduct(product);
    }
    console.log('✓ Productos de ejemplo creados');
  }

  // Inicializar servicios de ejemplo si no existen
  const services = await getServices();
  if (services.length === 0) {
    const sampleServices: Service[] = [
      { id: 'S1', name: 'Corte de Cabello', price: 150000, duration: 30, commission: 0.4 },
      { id: 'S2', name: 'Tinte Completo', price: 500000, duration: 120, commission: 0.35 },
      { id: 'S3', name: 'Mechas', price: 600000, duration: 150, commission: 0.35 },
      { id: 'S4', name: 'Peinado', price: 180000, duration: 45, commission: 0.4 },
      { id: 'S5', name: 'Manicure', price: 120000, duration: 45, commission: 0.5 },
      { id: 'S6', name: 'Pedicure', price: 150000, duration: 60, commission: 0.5 },
      { id: 'S7', name: 'Tratamiento Capilar', price: 280000, duration: 60, commission: 0.3 },
    ];

    for (const service of sampleServices) {
      await addService(service);
    }
    console.log('✓ Servicios de ejemplo creados');
  }
  
  // Inicializar artículos varios de ejemplo si no existen
  const miscItems = await getMiscItems();
  if (miscItems.length === 0) {
    const sampleMiscItems: MiscItem[] = [
      { id: 'M1', name: 'Hebillas Pack x6', price: 15000, stock: 50, minStock: 10 },
      { id: 'M2', name: 'Aros Grandes', price: 25000, stock: 30, minStock: 5 },
      { id: 'M3', name: 'Gomas Elásticas Pack x12', price: 12000, stock: 80, minStock: 15 },
      { id: 'M4', name: 'Peine Profesional', price: 35000, stock: 20, minStock: 5 },
      { id: 'M5', name: 'Cepillo Desenredante', price: 45000, stock: 15, minStock: 5 },
      { id: 'M6', name: 'Pinzas de Cabello', price: 18000, stock: 40, minStock: 8 },
      { id: 'M7', name: 'Vinchas Pack x3', price: 22000, stock: 25, minStock: 5 },
    ];

    for (const item of sampleMiscItems) {
      await addMiscItem(item);
    }
    console.log('✓ Artículos varios de ejemplo creados');
  }
}

// Artículos Varios
export async function getMiscItems(): Promise<MiscItem[]> {
  return db.getAll<MiscItem>(STORES.MISC_ITEMS);
}

export async function addMiscItem(item: MiscItem): Promise<MiscItem> {
  return db.add<MiscItem>(STORES.MISC_ITEMS, item);
}

export async function updateMiscItem(item: MiscItem): Promise<MiscItem> {
  return db.put<MiscItem>(STORES.MISC_ITEMS, item);
}

export async function deleteMiscItem(id: string): Promise<void> {
  return db.delete(STORES.MISC_ITEMS, id);
}