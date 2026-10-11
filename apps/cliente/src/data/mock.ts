// Demo data for the MVP prototype. Replace with the API once the backend exists.

// Mock BCV rate (Bs per USD) used to show VES prices.
export const TASA_BCV = 185.4;

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70`;

export type LatLng = { latitude: number; longitude: number };

export const CITY_CENTER: LatLng = { latitude: 10.3399, longitude: -68.7425 };

// Active coverage zone (RF-C02). The back office will manage these polygons (RF-B03).
export const COVERAGE_ZONE: LatLng[] = [
  { latitude: 10.3685, longitude: -68.7705 },
  { latitude: 10.3705, longitude: -68.7155 },
  { latitude: 10.3285, longitude: -68.7055 },
  { latitude: 10.3105, longitude: -68.7385 },
  { latitude: 10.3225, longitude: -68.7745 },
];

export type Category = { id: string; name: string; icon: string };

export type ModifierOption = { id: string; name: string; priceUsd: number };

// RF-C04: modifier groups with configurable rules.
export type ModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number; // 1 = single choice
  options: ModifierOption[];
};

export type Product = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  priceUsd: number;
  image: string;
  section: string;
  popular?: boolean;
  soldOut?: boolean;
  modifiers?: ModifierGroup[];
};

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  etaMin: number;
  etaMax: number;
  deliveryUsd: number;
  minimumUsd: number;
  priceLevel: 1 | 2 | 3;
  distanceKm: number;
  image: string;
  logo: string;
  tags: string[];
  address: string;
  schedule: string;
  location: LatLng;
  promo?: string;
  open: boolean;
  recommended: number;
};

export const CATEGORIES: Category[] = [
  { id: 'hamburguesas', name: 'Hamburguesas', icon: 'fast-food' },
  { id: 'pizza', name: 'Pizza', icon: 'pizza' },
  { id: 'pollo', name: 'Pollo', icon: 'restaurant' },
  { id: 'sushi', name: 'Sushi', icon: 'fish' },
  { id: 'saludable', name: 'Saludable', icon: 'leaf' },
  { id: 'postres', name: 'Postres', icon: 'ice-cream' },
  { id: 'cafe', name: 'Café', icon: 'cafe' },
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'la-parrilla-yaracuy',
    name: 'La Parrilla Yaracuy',
    category: 'hamburguesas',
    rating: 4.8,
    reviews: 312,
    etaMin: 25,
    etaMax: 35,
    deliveryUsd: 1.5,
    minimumUsd: 5,
    priceLevel: 2,
    distanceKm: 1.2,
    image: img('1568901346375-23c9450c58cd'),
    logo: img('1568901346375-23c9450c58cd', 200),
    tags: ['Hamburguesas', 'Parrilla'],
    address: 'Av. La Patria con calle 9, San Felipe',
    schedule: 'Lun a dom · 11:00 a. m. – 3:00 p. m. y 6:00 – 11:00 p. m.',
    location: { latitude: 10.3425, longitude: -68.7398 },
    promo: 'Delivery gratis con SIONNUEVO',
    open: true,
    recommended: 1,
  },
  {
    id: 'pizzeria-don-nicola',
    name: 'Pizzería Don Nicola',
    category: 'pizza',
    rating: 4.6,
    reviews: 198,
    etaMin: 30,
    etaMax: 45,
    deliveryUsd: 1.8,
    minimumUsd: 8,
    priceLevel: 2,
    distanceKm: 2.4,
    image: img('1513104890138-7c749659a591'),
    logo: img('1513104890138-7c749659a591', 200),
    tags: ['Pizza', 'Italiana'],
    address: 'C.C. Yaracuy Plaza, local 12, San Felipe',
    schedule: 'Mar a dom · 12:00 – 10:00 p. m.',
    location: { latitude: 10.3352, longitude: -68.7481 },
    promo: '2x1 los jueves',
    open: true,
    recommended: 2,
  },
  {
    id: 'pollos-el-cocuy',
    name: 'Pollos El Cocuy',
    category: 'pollo',
    rating: 4.5,
    reviews: 421,
    etaMin: 20,
    etaMax: 30,
    deliveryUsd: 1.2,
    minimumUsd: 4,
    priceLevel: 1,
    distanceKm: 0.8,
    image: img('1626082927389-6cd097cdc6ec'),
    logo: img('1626082927389-6cd097cdc6ec', 200),
    tags: ['Pollo', 'Brasa'],
    address: 'Calle 14 entre av. 5 y 6, San Felipe',
    schedule: 'Lun a dom · 11:00 a. m. – 9:00 p. m.',
    location: { latitude: 10.3381, longitude: -68.7442 },
    open: true,
    recommended: 3,
  },
  {
    id: 'sakura-sushi',
    name: 'Sakura Sushi Bar',
    category: 'sushi',
    rating: 4.7,
    reviews: 87,
    etaMin: 35,
    etaMax: 50,
    deliveryUsd: 2,
    minimumUsd: 10,
    priceLevel: 3,
    distanceKm: 3.1,
    image: img('1579871494447-9811cf80d66c'),
    logo: img('1579871494447-9811cf80d66c', 200),
    tags: ['Sushi', 'Japonesa'],
    address: 'Av. Caracas, Edif. Sakura PB, San Felipe',
    schedule: 'Mié a lun · 5:00 – 11:00 p. m.',
    location: { latitude: 10.3289, longitude: -68.7362 },
    open: true,
    recommended: 4,
  },
  {
    id: 'verde-bowl',
    name: 'Verde Bowl',
    category: 'saludable',
    rating: 4.4,
    reviews: 64,
    etaMin: 20,
    etaMax: 30,
    deliveryUsd: 0,
    minimumUsd: 5,
    priceLevel: 2,
    distanceKm: 1.9,
    image: img('1512621776951-a57141f2eefd'),
    logo: img('1512621776951-a57141f2eefd', 200),
    tags: ['Saludable', 'Bowls'],
    address: 'Calle 11 con av. Yaracuy, San Felipe',
    schedule: 'Lun a vie · 8:00 a. m. – 4:00 p. m.',
    location: { latitude: 10.3447, longitude: -68.7489 },
    open: false,
    recommended: 5,
  },
];

const SIZE_BURGER: ModifierGroup = {
  id: 'termino',
  name: 'Término de la carne',
  required: true,
  min: 1,
  max: 1,
  options: [
    { id: 'tm', name: 'Término medio', priceUsd: 0 },
    { id: 'tt', name: 'Tres cuartos', priceUsd: 0 },
    { id: 'bc', name: 'Bien cocida', priceUsd: 0 },
  ],
};

const EXTRAS_BURGER: ModifierGroup = {
  id: 'extras',
  name: 'Adicionales',
  required: false,
  min: 0,
  max: 3,
  options: [
    { id: 'queso', name: 'Queso extra', priceUsd: 0.8 },
    { id: 'tocineta', name: 'Tocineta extra', priceUsd: 1 },
    { id: 'papas', name: 'Papas medianas', priceUsd: 1.5 },
  ],
};

const REMOVE_BURGER: ModifierGroup = {
  id: 'quitar',
  name: 'Quitar ingredientes',
  required: false,
  min: 0,
  max: 4,
  options: [
    { id: 'sin-cebolla', name: 'Sin cebolla', priceUsd: 0 },
    { id: 'sin-tomate', name: 'Sin tomate', priceUsd: 0 },
    { id: 'sin-salsa', name: 'Sin salsa de la casa', priceUsd: 0 },
  ],
};

const PIZZA_SIZE: ModifierGroup = {
  id: 'tamano',
  name: 'Tamaño',
  required: true,
  min: 1,
  max: 1,
  options: [
    { id: 'p', name: 'Personal (25 cm)', priceUsd: 0 },
    { id: 'm', name: 'Mediana (33 cm)', priceUsd: 3 },
    { id: 'f', name: 'Familiar (40 cm)', priceUsd: 6 },
  ],
};

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    restaurantId: 'la-parrilla-yaracuy',
    name: 'Sion Burger doble',
    description: 'Doble carne de res, queso cheddar, tocineta, cebolla caramelizada y salsa de la casa en pan brioche.',
    priceUsd: 7.5,
    image: img('1568901346375-23c9450c58cd'),
    section: 'Hamburguesas',
    popular: true,
    modifiers: [SIZE_BURGER, EXTRAS_BURGER, REMOVE_BURGER],
  },
  {
    id: 'p2',
    restaurantId: 'la-parrilla-yaracuy',
    name: 'Clásica de la casa',
    description: 'Carne de res, lechuga, tomate, queso amarillo y salsas tradicionales.',
    priceUsd: 5,
    image: img('1550547660-d9450f859349'),
    section: 'Hamburguesas',
    modifiers: [SIZE_BURGER, EXTRAS_BURGER, REMOVE_BURGER],
  },
  {
    id: 'p9',
    restaurantId: 'la-parrilla-yaracuy',
    name: 'Burger BBQ ahumada',
    description: 'Carne de res, queso ahumado, aros de cebolla y salsa BBQ.',
    priceUsd: 6.5,
    image: img('1594212699903-ec8a3eca50f5'),
    section: 'Hamburguesas',
    soldOut: true,
  },
  {
    id: 'p3',
    restaurantId: 'la-parrilla-yaracuy',
    name: 'Papas rústicas',
    description: 'Papas con piel, sal de ajo y perejil. Con salsa tártara.',
    priceUsd: 2.5,
    image: img('1573080496219-bb080dd4f877'),
    section: 'Acompañantes',
    modifiers: [
      {
        id: 'salsa',
        name: 'Elige tu salsa',
        required: true,
        min: 1,
        max: 2,
        options: [
          { id: 'tartara', name: 'Tártara', priceUsd: 0 },
          { id: 'ajo', name: 'Ajo', priceUsd: 0 },
          { id: 'cheddar', name: 'Cheddar', priceUsd: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'p4',
    restaurantId: 'pizzeria-don-nicola',
    name: 'Pizza margarita',
    description: 'Salsa de tomate, mozzarella fresca y albahaca. Masa delgada al horno.',
    priceUsd: 8,
    image: img('1513104890138-7c749659a591'),
    section: 'Pizzas',
    popular: true,
    modifiers: [PIZZA_SIZE],
  },
  {
    id: 'p5',
    restaurantId: 'pizzeria-don-nicola',
    name: 'Pizza pepperoni',
    description: 'Mozzarella y abundante pepperoni.',
    priceUsd: 9.5,
    image: img('1594007654729-407eedc4be65'),
    section: 'Pizzas',
    modifiers: [PIZZA_SIZE],
  },
  {
    id: 'p6',
    restaurantId: 'pollos-el-cocuy',
    name: 'Pollo entero a la brasa',
    description: 'Con yuca, ensalada y salsas. Ideal para 4 personas.',
    priceUsd: 12,
    image: img('1626082927389-6cd097cdc6ec'),
    section: 'Combos',
    popular: true,
    modifiers: [
      {
        id: 'contorno',
        name: 'Contorno',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'yuca', name: 'Yuca frita', priceUsd: 0 },
          { id: 'papas', name: 'Papas fritas', priceUsd: 0 },
          { id: 'hallaquitas', name: 'Hallaquitas', priceUsd: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'p10',
    restaurantId: 'pollos-el-cocuy',
    name: 'Medio pollo',
    description: 'Medio pollo a la brasa con yuca y ensalada.',
    priceUsd: 6.5,
    image: img('1598515214211-89d3c73ae83b'),
    section: 'Combos',
  },
  {
    id: 'p7',
    restaurantId: 'sakura-sushi',
    name: 'Roll Sakura (10 pzs)',
    description: 'Salmón, queso crema y aguacate, cubierto de tempura.',
    priceUsd: 9,
    image: img('1579871494447-9811cf80d66c'),
    section: 'Rolls',
    popular: true,
  },
  {
    id: 'p8',
    restaurantId: 'verde-bowl',
    name: 'Bowl mediterráneo',
    description: 'Quinoa, garbanzos, pepino, tomate, queso feta y aderezo de yogurt.',
    priceUsd: 6.5,
    image: img('1546069901-ba9599a7e63c'),
    section: 'Bowls',
  },
];

export const getRestaurant = (id: string) => RESTAURANTS.find((r) => r.id === id);
export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const productsOf = (restaurantId: string) => PRODUCTS.filter((p) => p.restaurantId === restaurantId);

// RF-C09: demo coupons. `target` says whether the discount applies to products or to delivery.
export type Coupon = { code: string; label: string; target: 'productos' | 'delivery'; percent: number };

export const COUPONS: Coupon[] = [
  { code: 'SIONNUEVO', label: 'Delivery gratis en tu primer pedido', target: 'delivery', percent: 100 },
  { code: 'SION10', label: '10% de descuento en productos', target: 'productos', percent: 10 },
];

export const findCoupon = (code: string) => COUPONS.find((c) => c.code === code.trim().toUpperCase());

export const RIDER = {
  name: 'José Luis Pérez',
  photo: img('1500648767791-00dcc994a43e', 200),
  vehicle: 'Moto Bera SBR · AB1 23C',
  rating: 4.9,
  // Virtual number from the masked-calls provider (section 7): neither party sees the other's real phone.
  maskedPhone: '+580212000000',
};
