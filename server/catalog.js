// Catálogo de productos (datos de ejemplo).
// FASE 2: esto se reemplazará por consultas a APIs reales (SerpAPI, tiendas, etc.)
// sin que la app móvil tenga que cambiar.
// Los productos "online" reciben un enlace de búsqueda automático en online.js.

export const CATALOG = [
  // --- Auriculares ---
  { id: '1', name: 'Auriculares Sony WH-1000XM4', price: 249.99, store: 'Amazon', type: 'online', category: 'auriculares' },
  { id: '2', name: 'Auriculares Sony WH-1000XM4', price: 255.0, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'auriculares' },
  { id: '3', name: 'Auriculares Bluetooth Genéricos', price: 19.99, store: 'AliExpress', type: 'online', category: 'auriculares' },
  { id: '4', name: 'Auriculares de Estudio Shure', price: 99.0, store: 'Fnac (a 1.2km)', type: 'cerca', category: 'auriculares' },
  { id: '5', name: 'Auriculares Apple AirPods Pro 2', price: 279.0, store: 'Apple Store', type: 'online', category: 'auriculares' },
  { id: '6', name: 'Auriculares JBL Tune 510BT', price: 39.99, store: 'El Corte Inglés (a 800m)', type: 'cerca', category: 'auriculares' },

  // --- Teclados ---
  { id: '7', name: 'Teclado Mecánico Logitech G915', price: 189.99, store: 'Amazon', type: 'online', category: 'teclados' },
  { id: '8', name: 'Teclado Inalámbrico Logitech K380', price: 34.95, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'teclados' },
  { id: '9', name: 'Teclado Mecánico Keychron K2', price: 89.0, store: 'PcComponentes', type: 'online', category: 'teclados' },
  { id: '10', name: 'Teclado Membrana Genérico', price: 12.99, store: 'AliExpress', type: 'online', category: 'teclados' },

  // --- Ratones ---
  { id: '11', name: 'Ratón Logitech MX Master 3S', price: 119.0, store: 'PcComponentes', type: 'online', category: 'ratones' },
  { id: '12', name: 'Ratón Gaming Razer DeathAdder', price: 49.99, store: 'Fnac (a 1.2km)', type: 'cerca', category: 'ratones' },
  { id: '13', name: 'Ratón Inalámbrico Logitech M185', price: 14.99, store: 'Carrefour (a 600m)', type: 'cerca', category: 'ratones' },

  // --- Monitores ---
  { id: '14', name: 'Monitor Dell 27" 4K', price: 389.0, store: 'Amazon', type: 'online', category: 'monitores' },
  { id: '15', name: 'Monitor LG 24" Full HD', price: 99.99, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'monitores' },
  { id: '16', name: 'Monitor Samsung 32" Curvo', price: 279.0, store: 'Worten (a 1.5km)', type: 'cerca', category: 'monitores' },

  // --- Portátiles ---
  { id: '17', name: 'Portátil Lenovo IdeaPad 3', price: 449.0, store: 'Amazon', type: 'online', category: 'portatiles' },
  { id: '18', name: 'Portátil HP Pavilion 15', price: 599.0, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'portatiles' },
  { id: '19', name: 'MacBook Air M3', price: 1199.0, store: 'Apple Store', type: 'online', category: 'portatiles' },

  // --- Móviles ---
  { id: '20', name: 'Smartphone Xiaomi Redmi Note 13', price: 199.0, store: 'Amazon', type: 'online', category: 'moviles' },
  { id: '21', name: 'iPhone 15', price: 859.0, store: 'El Corte Inglés (a 800m)', type: 'cerca', category: 'moviles' },
  { id: '22', name: 'Samsung Galaxy A55', price: 379.0, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'moviles' },

  // --- Tablets ---
  { id: '23', name: 'Tablet Samsung Galaxy Tab A9', price: 159.0, store: 'PcComponentes', type: 'online', category: 'tablets' },
  { id: '24', name: 'iPad 10ª generación', price: 489.0, store: 'Fnac (a 1.2km)', type: 'cerca', category: 'tablets' },

  // --- Smartwatch ---
  { id: '25', name: 'Smartwatch Xiaomi Watch 2', price: 79.99, store: 'AliExpress', type: 'online', category: 'smartwatch' },
  { id: '26', name: 'Apple Watch SE', price: 269.0, store: 'Apple Store', type: 'online', category: 'smartwatch' },
  { id: '27', name: 'Smartwatch Amazfit GTS 4', price: 129.0, store: 'Carrefour (a 600m)', type: 'cerca', category: 'smartwatch' },

  // --- Almacenamiento ---
  { id: '28', name: 'SSD Samsung 980 1TB', price: 79.99, store: 'Amazon', type: 'online', category: 'almacenamiento' },
  { id: '29', name: 'Disco Duro Externo Seagate 2TB', price: 64.99, store: 'PcComponentes', type: 'online', category: 'almacenamiento' },
  { id: '30', name: 'Pendrive SanDisk 128GB', price: 12.99, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'almacenamiento' },

  // --- Cargadores / cables ---
  { id: '31', name: 'Cargador USB-C 65W Anker', price: 29.99, store: 'Amazon', type: 'online', category: 'cargadores' },
  { id: '32', name: 'Cable USB-C Genérico 2m', price: 7.5, store: 'AliExpress', type: 'online', category: 'cables' },
  { id: '33', name: 'Powerbank Xiaomi 20000mAh', price: 24.99, store: 'Carrefour (a 600m)', type: 'cerca', category: 'cargadores' },

  // --- Webcams / audio ---
  { id: '34', name: 'Webcam Logitech C920', price: 79.99, store: 'El Corte Inglés (a 800m)', type: 'cerca', category: 'webcams' },
  { id: '35', name: 'Altavoz Bluetooth JBL Flip 6', price: 129.0, store: 'Fnac (a 1.2km)', type: 'cerca', category: 'altavoces' },
  { id: '36', name: 'Barra de Sonido LG 2.1', price: 149.0, store: 'MediaMarkt (a 450m)', type: 'cerca', category: 'altavoces' },
  { id: '37', name: 'Micrófono USB Fifine', price: 39.99, store: 'Amazon', type: 'online', category: 'microfonos' },

  // --- Impresoras ---
  { id: '38', name: 'Impresora HP DeskJet 2720e', price: 59.99, store: 'Worten (a 1.5km)', type: 'cerca', category: 'impresoras' },
  { id: '39', name: 'Impresora Epson EcoTank ET-2850', price: 249.0, store: 'Amazon', type: 'online', category: 'impresoras' },

  // --- Sillas / otros ---
  { id: '40', name: 'Silla de Oficina Ergonómica', price: 119.0, store: 'IKEA (a 2.1km)', type: 'cerca', category: 'sillas' },
];
