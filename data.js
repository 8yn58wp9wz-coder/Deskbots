/* BasketWise — UK grocery sample catalogue (illustrative prices) */
window.BasketWiseData = (function () {
  const STORES = {
    asda: {
      id: 'asda',
      name: 'Asda',
      short: 'Asda',
      colour: '#68a51f',
      loyalty: 'Asda Rewards',
      delivery: { name: 'Asda Delivery', fee: 3.5, freeOver: 40 },
    },
    tesco: {
      id: 'tesco',
      name: 'Tesco',
      short: 'Tesco',
      colour: '#00539f',
      loyalty: 'Clubcard',
      delivery: { name: 'Tesco Delivery', fee: 4.0, freeOver: 40 },
    },
    morrisons: {
      id: 'morrisons',
      name: 'Morrisons',
      short: 'Morrisons',
      colour: '#00563f',
      loyalty: 'Morrisons More',
      delivery: { name: 'Morrisons Delivery', fee: 3.75, freeOver: 40 },
    },
    sainsburys: {
      id: 'sainsburys',
      name: "Sainsbury's",
      short: "Sainsbury's",
      colour: '#f67828',
      loyalty: 'Nectar',
      delivery: { name: "Sainsbury's Delivery", fee: 4.0, freeOver: 40 },
      extra: true,
    },
    waitrose: {
      id: 'waitrose',
      name: 'Waitrose',
      short: 'Waitrose',
      colour: '#78be20',
      loyalty: 'myWaitrose',
      delivery: { name: 'Waitrose Delivery', fee: 6.0, freeOver: 60 },
      extra: true,
    },
    iceland: {
      id: 'iceland',
      name: 'Iceland',
      short: 'Iceland',
      colour: '#e30613',
      loyalty: 'Bonus Card',
      delivery: { name: 'Iceland Delivery', fee: 3.0, freeOver: 35 },
      extra: true,
    },
    ocado: {
      id: 'ocado',
      name: 'Ocado',
      short: 'Ocado',
      colour: '#6d1f7a',
      loyalty: null,
      delivery: { name: 'Ocado Delivery', fee: 2.99, freeOver: 40 },
      extra: true,
    },
  };

  const DEFAULT_STORE_IDS = ['asda', 'tesco', 'morrisons'];
  const EXTRA_STORE_IDS = Object.keys(STORES).filter((id) => STORES[id].extra);

  /* Relative sample price factors for optional stores (illustrative, not live) */
  const EXTRA_PRICE_FACTOR = {
    sainsburys: 1.06,
    waitrose: 1.22,
    iceland: 0.94,
    ocado: 1.12,
  };

  /* Each product: store offers with price, pack, unit, loyalty price optional, lastUpdated */
  const PRODUCTS = [
    {
      id: 'milk-semi-2l',
      name: 'Semi-skimmed milk',
      category: 'Dairy',
      query: ['milk', 'semi', 'semi-skimmed'],
      offers: {
        asda: { price: 1.45, pack: '2L', unit: '£0.73/L', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 1.55, pack: '2.272L', unit: '£0.68/L', loyalty: 1.35, updated: '2026-10-15' },
        morrisons: { price: 1.49, pack: '2L', unit: '£0.75/L', loyalty: 1.39, updated: '2026-10-13' },
      },
    },
    {
      id: 'bread-white',
      name: 'White sliced loaf',
      category: 'Bakery',
      query: ['bread', 'loaf', 'white bread'],
      offers: {
        asda: { price: 0.99, pack: '800g', unit: '£0.12/100g', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 0.69, pack: '800g', unit: '£0.09/100g', loyalty: 0.55, updated: '2026-10-15' },
        morrisons: { price: 0.92, pack: '800g', unit: '£0.12/100g', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'eggs-6',
      name: 'Free range eggs',
      category: 'Dairy',
      query: ['eggs', 'egg'],
      offers: {
        asda: { price: 2.05, pack: '6 pack', unit: '£0.34/egg', loyalty: 1.85, updated: '2026-10-14' },
        tesco: { price: 2.10, pack: '6 pack', unit: '£0.35/egg', loyalty: 1.75, updated: '2026-10-15' },
        morrisons: { price: 1.65, pack: '6 pack', unit: '£0.28/egg', loyalty: 1.50, updated: '2026-10-13' },
      },
    },
    {
      id: 'chicken-breast-500',
      name: 'Chicken breast fillets',
      category: 'Meat',
      query: ['chicken', 'chicken breast'],
      offers: {
        asda: { price: 3.95, pack: '500g', unit: '£7.90/kg', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 4.00, pack: '470g', unit: '£8.51/kg', loyalty: 3.50, updated: '2026-10-15' },
        morrisons: { price: 3.45, pack: '500g', unit: '£6.90/kg', loyalty: 3.20, updated: '2026-10-14' },
      },
    },
    {
      id: 'mince-500',
      name: 'Lean beef mince',
      category: 'Meat',
      query: ['mince', 'beef mince', 'beef'],
      offers: {
        asda: { price: 3.20, pack: '500g', unit: '£6.40/kg', loyalty: 2.90, updated: '2026-10-14' },
        tesco: { price: 3.50, pack: '500g', unit: '£7.00/kg', loyalty: 2.95, updated: '2026-10-15' },
        morrisons: { price: 3.35, pack: '500g', unit: '£6.70/kg', loyalty: null, updated: '2026-10-13' },
      },
    },
    {
      id: 'pasta-500',
      name: 'Dried pasta penne',
      category: 'Cupboard',
      query: ['pasta', 'penne'],
      offers: {
        asda: { price: 0.89, pack: '500g', unit: '£1.78/kg', loyalty: null, updated: '2026-10-12' },
        tesco: { price: 0.55, pack: '500g', unit: '£1.10/kg', loyalty: 0.45, updated: '2026-10-15' },
        morrisons: { price: 0.79, pack: '500g', unit: '£1.58/kg', loyalty: 0.69, updated: '2026-10-14' },
      },
    },
    {
      id: 'rice-1kg',
      name: 'Long grain rice',
      category: 'Cupboard',
      query: ['rice'],
      offers: {
        asda: { price: 1.25, pack: '1kg', unit: '£1.25/kg', loyalty: null, updated: '2026-10-13' },
        tesco: { price: 1.40, pack: '1kg', unit: '£1.40/kg', loyalty: 1.10, updated: '2026-10-15' },
        morrisons: { price: 1.30, pack: '1kg', unit: '£1.30/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'passata-500',
      name: 'Tomato passata',
      category: 'Cupboard',
      query: ['passata', 'tomato', 'tomatoes'],
      offers: {
        asda: { price: 0.65, pack: '500g', unit: '£1.30/kg', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 0.75, pack: '500g', unit: '£1.50/kg', loyalty: 0.55, updated: '2026-10-15' },
        morrisons: { price: 0.69, pack: '500g', unit: '£1.38/kg', loyalty: 0.59, updated: '2026-10-13' },
      },
    },
    {
      id: 'cheddar-350',
      name: 'Mature cheddar',
      category: 'Dairy',
      query: ['cheese', 'cheddar'],
      offers: {
        asda: { price: 2.85, pack: '350g', unit: '£8.14/kg', loyalty: 2.50, updated: '2026-10-15' },
        tesco: { price: 3.00, pack: '400g', unit: '£7.50/kg', loyalty: 2.50, updated: '2026-10-15' },
        morrisons: { price: 2.90, pack: '350g', unit: '£8.29/kg', loyalty: 2.60, updated: '2026-10-14' },
      },
    },
    {
      id: 'butter-250',
      name: 'Salted butter',
      category: 'Dairy',
      query: ['butter'],
      offers: {
        asda: { price: 1.89, pack: '250g', unit: '£7.56/kg', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 2.10, pack: '250g', unit: '£8.40/kg', loyalty: 1.75, updated: '2026-10-15' },
        morrisons: { price: 1.95, pack: '250g', unit: '£7.80/kg', loyalty: 1.80, updated: '2026-10-13' },
      },
    },
    {
      id: 'potatoes-2kg',
      name: 'White potatoes',
      category: 'Produce',
      query: ['potato', 'potatoes'],
      offers: {
        asda: { price: 1.35, pack: '2.5kg', unit: '£0.54/kg', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 1.50, pack: '2kg', unit: '£0.75/kg', loyalty: 1.20, updated: '2026-10-15' },
        morrisons: { price: 1.40, pack: '2.5kg', unit: '£0.56/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'onions-1kg',
      name: 'Brown onions',
      category: 'Produce',
      query: ['onion', 'onions'],
      offers: {
        asda: { price: 0.85, pack: '1kg', unit: '£0.85/kg', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 0.95, pack: '1kg', unit: '£0.95/kg', loyalty: 0.75, updated: '2026-10-15' },
        morrisons: { price: 0.89, pack: '1kg', unit: '£0.89/kg', loyalty: null, updated: '2026-10-13' },
      },
    },
    {
      id: 'carrots-1kg',
      name: 'Carrots',
      category: 'Produce',
      query: ['carrot', 'carrots'],
      offers: {
        asda: { price: 0.55, pack: '1kg', unit: '£0.55/kg', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 0.62, pack: '1kg', unit: '£0.62/kg', loyalty: 0.49, updated: '2026-10-15' },
        morrisons: { price: 0.58, pack: '1kg', unit: '£0.58/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'baked-beans',
      name: 'Baked beans',
      category: 'Cupboard',
      query: ['beans', 'baked beans'],
      offers: {
        asda: { price: 0.55, pack: '415g', unit: '£1.33/kg', loyalty: null, updated: '2026-10-12' },
        tesco: { price: 0.65, pack: '415g', unit: '£1.57/kg', loyalty: 0.45, updated: '2026-10-15' },
        morrisons: { price: 0.59, pack: '415g', unit: '£1.42/kg', loyalty: 0.49, updated: '2026-10-13' },
      },
    },
    {
      id: 'tinned-tuna',
      name: 'Tinned tuna in brine',
      category: 'Cupboard',
      query: ['tuna'],
      offers: {
        asda: { price: 0.95, pack: '145g', unit: '£6.55/kg', loyalty: 0.80, updated: '2026-10-14' },
        tesco: { price: 1.10, pack: '160g', unit: '£6.88/kg', loyalty: 0.85, updated: '2026-10-15' },
        morrisons: { price: 0.99, pack: '145g', unit: '£6.83/kg', loyalty: null, updated: '2026-10-13' },
      },
    },
    {
      id: 'yoghurt-500',
      name: 'Natural yoghurt',
      category: 'Dairy',
      query: ['yoghurt', 'yogurt'],
      offers: {
        asda: { price: 1.10, pack: '500g', unit: '£2.20/kg', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 1.25, pack: '500g', unit: '£2.50/kg', loyalty: 0.95, updated: '2026-10-15' },
        morrisons: { price: 1.15, pack: '500g', unit: '£2.30/kg', loyalty: 1.00, updated: '2026-10-14' },
      },
    },
    {
      id: 'oats-1kg',
      name: 'Porridge oats',
      category: 'Cupboard',
      query: ['oats', 'porridge'],
      offers: {
        asda: { price: 1.15, pack: '1kg', unit: '£1.15/kg', loyalty: null, updated: '2026-10-13' },
        tesco: { price: 1.30, pack: '1kg', unit: '£1.30/kg', loyalty: 1.00, updated: '2026-10-15' },
        morrisons: { price: 1.20, pack: '1kg', unit: '£1.20/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'apples-6',
      name: 'Eating apples',
      category: 'Produce',
      query: ['apple', 'apples'],
      offers: {
        asda: { price: 1.50, pack: '6 pack', unit: '£0.25/apple', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 1.70, pack: '6 pack', unit: '£0.28/apple', loyalty: 1.40, updated: '2026-10-15' },
        morrisons: { price: 1.55, pack: '6 pack', unit: '£0.26/apple', loyalty: 1.35, updated: '2026-10-14' },
      },
    },
    {
      id: 'bananas',
      name: 'Bananas',
      category: 'Produce',
      query: ['banana', 'bananas'],
      offers: {
        asda: { price: 0.95, pack: '5 pack', unit: '£0.19/banana', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 1.05, pack: '5 pack', unit: '£0.21/banana', loyalty: 0.89, updated: '2026-10-15' },
        morrisons: { price: 0.99, pack: 'loose ~800g', unit: '£1.24/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'frozen-peas',
      name: 'Frozen garden peas',
      category: 'Frozen',
      query: ['peas', 'frozen peas'],
      offers: {
        asda: { price: 0.85, pack: '900g', unit: '£0.94/kg', loyalty: null, updated: '2026-10-12' },
        tesco: { price: 0.95, pack: '1kg', unit: '£0.95/kg', loyalty: 0.75, updated: '2026-10-15' },
        morrisons: { price: 0.89, pack: '900g', unit: '£0.99/kg', loyalty: 0.79, updated: '2026-10-13' },
      },
    },
    {
      id: 'lentils-500',
      name: 'Red lentils',
      category: 'Cupboard',
      query: ['lentils', 'lentil'],
      offers: {
        asda: { price: 1.40, pack: '500g', unit: '£2.80/kg', loyalty: null, updated: '2026-10-13' },
        tesco: { price: 1.55, pack: '500g', unit: '£3.10/kg', loyalty: 1.25, updated: '2026-10-15' },
        morrisons: { price: 1.45, pack: '500g', unit: '£2.90/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'chickpeas',
      name: 'Tinned chickpeas',
      category: 'Cupboard',
      query: ['chickpeas', 'chickpea'],
      offers: {
        asda: { price: 0.55, pack: '400g', unit: '£1.38/kg', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 0.65, pack: '400g', unit: '£1.63/kg', loyalty: 0.50, updated: '2026-10-15' },
        morrisons: { price: 0.59, pack: '400g', unit: '£1.48/kg', loyalty: 0.49, updated: '2026-10-13' },
      },
    },
    {
      id: 'spinach',
      name: 'Fresh spinach',
      category: 'Produce',
      query: ['spinach'],
      offers: {
        asda: { price: 1.00, pack: '200g', unit: '£5.00/kg', loyalty: null, updated: '2026-10-15' },
        tesco: { price: 1.15, pack: '200g', unit: '£5.75/kg', loyalty: 0.90, updated: '2026-10-15' },
        morrisons: { price: 1.05, pack: '200g', unit: '£5.25/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'salmon-fillets',
      name: 'Salmon fillets',
      category: 'Fish',
      query: ['salmon'],
      offers: {
        asda: { price: 5.50, pack: '260g (2)', unit: '£21.15/kg', loyalty: 4.75, updated: '2026-10-15' },
        tesco: { price: 6.00, pack: '240g (2)', unit: '£25.00/kg', loyalty: 5.00, updated: '2026-10-15' },
        morrisons: { price: 5.75, pack: '260g (2)', unit: '£22.12/kg', loyalty: 5.00, updated: '2026-10-14' },
      },
    },
    {
      id: 'dog-food-dry',
      name: 'Dry dog food',
      category: 'Pet',
      query: ['dog food', 'dogfood', 'dry dog food', 'dog', 'puppy food'],
      offers: {
        asda: { price: 8.50, pack: '2.5kg', unit: '£3.40/kg', loyalty: 7.50, updated: '2026-10-15' },
        tesco: { price: 9.00, pack: '2.5kg', unit: '£3.60/kg', loyalty: 7.75, updated: '2026-10-15' },
        morrisons: { price: 8.75, pack: '2.5kg', unit: '£3.50/kg', loyalty: 7.90, updated: '2026-10-14' },
      },
    },
    {
      id: 'dog-food-wet',
      name: 'Wet dog food trays',
      category: 'Pet',
      query: ['wet dog food', 'dog trays', 'dog pouches'],
      offers: {
        asda: { price: 4.25, pack: '6 x 100g', unit: '£7.08/kg', loyalty: null, updated: '2026-10-14' },
        tesco: { price: 4.50, pack: '6 x 100g', unit: '£7.50/kg', loyalty: 3.75, updated: '2026-10-15' },
        morrisons: { price: 4.35, pack: '6 x 100g', unit: '£7.25/kg', loyalty: 3.90, updated: '2026-10-13' },
      },
    },
    {
      id: 'cat-food',
      name: 'Cat food pouches',
      category: 'Pet',
      query: ['cat food', 'catfood', 'cat', 'kitten food'],
      offers: {
        asda: { price: 3.80, pack: '12 x 85g', unit: '£3.73/kg', loyalty: 3.40, updated: '2026-10-15' },
        tesco: { price: 4.00, pack: '12 x 85g', unit: '£3.92/kg', loyalty: 3.50, updated: '2026-10-15' },
        morrisons: { price: 3.90, pack: '12 x 85g', unit: '£3.82/kg', loyalty: null, updated: '2026-10-14' },
      },
    },
    {
      id: 'washing-up-liquid',
      name: 'Washing-up liquid',
      category: 'Household',
      query: ['washing up', 'washing-up', 'washing up liquid', 'fairy'],
      offers: {
        asda: { price: 1.25, pack: '450ml', unit: '£2.78/L', loyalty: null, updated: '2026-10-13' },
        tesco: { price: 1.40, pack: '433ml', unit: '£3.23/L', loyalty: 1.10, updated: '2026-10-15' },
        morrisons: { price: 1.30, pack: '450ml', unit: '£2.89/L', loyalty: 1.15, updated: '2026-10-14' },
      },
    },
    {
      id: 'toilet-roll',
      name: 'Toilet roll',
      category: 'Household',
      query: ['toilet roll', 'toilet paper', 'loo roll'],
      offers: {
        asda: { price: 3.95, pack: '9 rolls', unit: '£0.44/roll', loyalty: 3.50, updated: '2026-10-15' },
        tesco: { price: 4.25, pack: '9 rolls', unit: '£0.47/roll', loyalty: 3.50, updated: '2026-10-15' },
        morrisons: { price: 4.00, pack: '9 rolls', unit: '£0.44/roll', loyalty: null, updated: '2026-10-14' },
      },
    },
  ];

  const DEFAULT_LIST = [
    'Semi-skimmed milk',
    'White sliced loaf',
    'Free range eggs',
    'Chicken breast fillets',
    'Dried pasta penne',
    'Tomato passata',
    'White potatoes',
    'Brown onions',
    'Carrots',
    'Baked beans',
  ];

  const DIETS = [
    { id: 'none', label: 'No restriction' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'gluten-free', label: 'Gluten-free' },
    { id: 'dairy-free', label: 'Dairy-free' },
  ];

  const DISLIKES = [
    { id: 'mushrooms', label: 'Mushrooms' },
    { id: 'fish', label: 'Fish' },
    { id: 'spicy', label: 'Spicy food' },
    { id: 'lamb', label: 'Lamb' },
    { id: 'coriander', label: 'Coriander' },
    { id: 'aubergine', label: 'Aubergine' },
  ];

  /* Meals reference product ids; costEstimated from cheapest store shelf prices */
  const MEALS = [
    {
      id: 'pasta-bolognese',
      name: 'Pasta bolognese',
      serves: 4,
      time: 35,
      diets: ['none'],
      tags: [],
      avoid: [],
      ingredients: ['mince-500', 'pasta-500', 'passata-500', 'onions-1kg', 'carrots-1kg'],
      swapFrom: null,
      tip: 'Use lean mince on loyalty and stretch with extra carrot.',
    },
    {
      id: 'veggie-pasta',
      name: 'Tomato & lentil pasta',
      serves: 4,
      time: 30,
      diets: ['none', 'vegetarian', 'vegan', 'dairy-free'],
      tags: [],
      avoid: [],
      ingredients: ['pasta-500', 'passata-500', 'lentils-500', 'onions-1kg', 'carrots-1kg'],
      swapFrom: 'pasta-bolognese',
      tip: 'Lentils cut the meat cost while keeping protein high.',
    },
    {
      id: 'chicken-rice',
      name: 'Chicken & rice traybake',
      serves: 4,
      time: 45,
      diets: ['none', 'dairy-free', 'gluten-free'],
      tags: [],
      avoid: [],
      ingredients: ['chicken-breast-500', 'rice-1kg', 'onions-1kg', 'carrots-1kg', 'frozen-peas'],
      swapFrom: null,
      tip: 'One-tray cooking keeps energy and washing-up down.',
    },
    {
      id: 'chickpea-curry',
      name: 'Chickpea & spinach curry',
      serves: 4,
      time: 25,
      diets: ['none', 'vegetarian', 'vegan', 'dairy-free', 'gluten-free'],
      tags: ['spicy'],
      avoid: [],
      ingredients: ['chickpeas', 'spinach', 'rice-1kg', 'onions-1kg', 'passata-500'],
      swapFrom: 'chicken-rice',
      tip: 'Tinned chickpeas are often the cheapest protein per serving.',
    },
    {
      id: 'tuna-pasta',
      name: 'Tuna pasta bake',
      serves: 4,
      time: 40,
      diets: ['none'],
      tags: ['fish'],
      avoid: [],
      ingredients: ['tinned-tuna', 'pasta-500', 'passata-500', 'cheddar-350', 'frozen-peas'],
      swapFrom: null,
      tip: 'A store-brand tuna tin keeps this under a fiver for four.',
    },
    {
      id: 'bean-jacket',
      name: 'Jacket potatoes with beans & cheese',
      serves: 4,
      time: 55,
      diets: ['none', 'vegetarian', 'gluten-free'],
      tags: [],
      avoid: [],
      ingredients: ['potatoes-2kg', 'baked-beans', 'cheddar-350', 'butter-250'],
      swapFrom: 'tuna-pasta',
      tip: 'Skip cheese for a dairy-free version with beans only.',
    },
    {
      id: 'veggie-jacket',
      name: 'Jacket potatoes with beans',
      serves: 4,
      time: 55,
      diets: ['none', 'vegetarian', 'vegan', 'dairy-free', 'gluten-free'],
      tags: [],
      avoid: [],
      ingredients: ['potatoes-2kg', 'baked-beans', 'onions-1kg'],
      swapFrom: 'bean-jacket',
      tip: 'Drop butter and cheese — still filling, much cheaper.',
    },
    {
      id: 'salmon-veg',
      name: 'Salmon with peas & mash',
      serves: 2,
      time: 30,
      diets: ['none', 'dairy-free', 'gluten-free'],
      tags: ['fish'],
      avoid: [],
      ingredients: ['salmon-fillets', 'potatoes-2kg', 'frozen-peas', 'butter-250'],
      swapFrom: null,
      tip: 'Treat night — watch Clubcard/More prices on salmon.',
    },
    {
      id: 'omelette-night',
      name: 'Veggie omelette & toast',
      serves: 2,
      time: 20,
      diets: ['none', 'vegetarian'],
      tags: [],
      avoid: [],
      ingredients: ['eggs-6', 'spinach', 'cheddar-350', 'bread-white', 'butter-250'],
      swapFrom: 'salmon-veg',
      tip: 'Eggs stretch further than fish when budgets are tight.',
    },
    {
      id: 'porridge-bananas',
      name: 'Banana porridge supper',
      serves: 4,
      time: 15,
      diets: ['none', 'vegetarian', 'vegan', 'dairy-free', 'gluten-free'],
      tags: [],
      avoid: [],
      ingredients: ['oats-1kg', 'bananas', 'milk-semi-2l'],
      swapFrom: null,
      tip: 'Use oat milk for dairy-free; still one of the cheapest fills.',
    },
    {
      id: 'mince-pies-alt',
      name: 'Shepherd-style lentil pie',
      serves: 4,
      time: 50,
      diets: ['none', 'vegetarian', 'vegan', 'dairy-free', 'gluten-free'],
      tags: [],
      avoid: [],
      ingredients: ['lentils-500', 'potatoes-2kg', 'carrots-1kg', 'onions-1kg', 'passata-500'],
      swapFrom: 'pasta-bolognese',
      tip: 'Same comfort as mince night for roughly half the cost.',
    },
  ];

  /* Seed sample offers for optional stores from the three core prices */
  PRODUCTS.forEach((p) => {
    const core = DEFAULT_STORE_IDS.map((id) => p.offers[id]).filter(Boolean);
    if (!core.length) return;
    const avg =
      core.reduce((sum, o) => sum + o.price, 0) / core.length;
    const pack = core[0].pack;
    const unit = core[0].unit;
    EXTRA_STORE_IDS.forEach((id) => {
      if (p.offers[id]) return;
      const factor = EXTRA_PRICE_FACTOR[id] || 1.05;
      const price = Math.round(avg * factor * 100) / 100;
      p.offers[id] = {
        price,
        pack,
        unit,
        loyalty: null,
        updated: '2026-10-15',
        sample: true,
      };
    });
  });

  return {
    STORES,
    PRODUCTS,
    DEFAULT_LIST,
    DIETS,
    DISLIKES,
    MEALS,
    DEFAULT_STORE_IDS,
    EXTRA_STORE_IDS,
  };
})();
