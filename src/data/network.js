export const PORTS = [
  // India (2): Entry/exit for India
  { id: 'INNSA', name: 'Mumbai (Nhava Sheva)', region: 'India', lat: 18.95, lng: 72.95 },
  { id: 'INMAA', name: 'Chennai', region: 'India', lat: 13.10, lng: 80.30 },

  // Middle East (3): Oil + major routing hub
  { id: 'AEDXA', name: 'Jebel Ali (Dubai)', region: 'Middle East', lat: 25.00, lng: 55.05 },
  { id: 'SADMM', name: 'Dammam', region: 'Middle East', lat: 26.50, lng: 50.15 },
  { id: 'OMSAL', name: 'Salalah', region: 'Middle East', lat: 16.95, lng: 54.00 },

  // Suez / Red Sea (2): MOST IMPORTANT CHOKEPOINT
  { id: 'EGPSD', name: 'Port Said', region: 'Middle East', lat: 31.25, lng: 32.30 },
  { id: 'SAJED', name: 'Jeddah', region: 'Middle East', lat: 21.48, lng: 39.17 },

  // Southeast Asia (1): Global mega hub
  { id: 'SGSIN', name: 'Singapore', region: 'Asia', lat: 1.25, lng: 103.80 },

  // Southeast Asia Alt (2): Alternative routing paths
  { id: 'MYPKG', name: 'Port Klang', region: 'Asia', lat: 3.00, lng: 101.40 },
  { id: 'IDTPP', name: 'Tanjung Priok', region: 'Asia', lat: -6.10, lng: 106.88 },

  // China (3): Heavy traffic
  { id: 'CNSHG', name: 'Shanghai', region: 'Asia', lat: 31.20, lng: 121.50 },
  { id: 'CNSZX', name: 'Shenzhen', region: 'Asia', lat: 22.50, lng: 113.90 },
  { id: 'CNNGB', name: 'Ningbo-Zhoushan', region: 'Asia', lat: 29.90, lng: 122.00 },

  // East Asia (2): Regional distribution nodes
  { id: 'KRPUS', name: 'Busan', region: 'Asia', lat: 35.10, lng: 129.00 },
  { id: 'JPTYO', name: 'Tokyo', region: 'Asia', lat: 35.60, lng: 139.70 },

  // South Asia (1): Important alternate
  { id: 'LKCMB', name: 'Colombo', region: 'Asia', lat: 6.95, lng: 79.85 },

  // Europe (3): Major European entry points
  { id: 'NLRTM', name: 'Rotterdam', region: 'Europe', lat: 51.90, lng: 4.10 },
  { id: 'DEHAM', name: 'Hamburg', region: 'Europe', lat: 53.50, lng: 9.90 },
  { id: 'BEANR', name: 'Antwerp', region: 'Europe', lat: 51.30, lng: 4.30 },

  // Africa (1): Alternative long-route fallback
  { id: 'ZADUR', name: 'Durban', region: 'Africa', lat: -29.80, lng: 31.00 },

  // North America (2): Consumption hubs
  { id: 'USLAX', name: 'Los Angeles', region: 'Americas', lat: 33.75, lng: -118.25 },
  { id: 'USNYC', name: 'New York / New Jersey', region: 'Americas', lat: 40.68, lng: -74.00 },

  // Panama Region (1): Panama Canal chokepoint
  { id: 'PABLB', name: 'Balboa (Panama)', region: 'Americas', lat: 8.95, lng: -79.56 }
];

// Helper wrapper to enforce directional pairings
const createBiRoute = (s, d, baseTime, baseCost, severity=1) => [
  { source: s, destination: d, baseTime, riskMultiplier: severity, costBase: baseCost },
  { source: d, destination: s, baseTime, riskMultiplier: severity, costBase: baseCost }
];

export const ROUTES = [
  // Core Europe Local
  ...createBiRoute('NLRTM', 'DEHAM', 24, 200, 1),
  ...createBiRoute('NLRTM', 'BEANR', 12, 100, 1),

  // Europe -> Med -> Suez
  ...createBiRoute('NLRTM', 'EGPSD', 240, 1800, 1.2), // Atlantic to Med
  
  // SUEZ CANAL chokepoint
  ...createBiRoute('EGPSD', 'SAJED', 48, 600, 2.5), // High risk transit
  ...createBiRoute('SAJED', 'OMSAL', 96, 800, 2.0),

  // Middle East / Persian Gulf
  ...createBiRoute('OMSAL', 'AEDXA', 72, 500, 1.5),
  ...createBiRoute('AEDXA', 'SADMM', 24, 200, 1.2),

  // Alternative: Cape of Good Hope
  ...createBiRoute('NLRTM', 'ZADUR', 450, 2500, 1.3),
  ...createBiRoute('ZADUR', 'OMSAL', 200, 1200, 1.4),
  ...createBiRoute('ZADUR', 'SGSIN', 380, 2100, 1.5),

  // Indian Subcontinent
  ...createBiRoute('OMSAL', 'INNSA', 72, 600, 1), // Oman to Mumbai
  ...createBiRoute('INNSA', 'LKCMB', 48, 400, 1), // Mumbai to Colombo
  ...createBiRoute('LKCMB', 'INMAA', 36, 300, 1), // Colombo to Chennai

  // Asia / Malacca Strait
  ...createBiRoute('LKCMB', 'SGSIN', 96, 900, 1.3), // The main Indian Ocean crossing
  ...createBiRoute('LKCMB', 'MYPKG', 90, 850, 1.2), // Alt crossing
  ...createBiRoute('INMAA', 'SGSIN', 110, 1000, 1.2),

  // SEA Local Hub Network
  ...createBiRoute('SGSIN', 'MYPKG', 24, 200, 1),
  ...createBiRoute('SGSIN', 'IDTPP', 48, 300, 1),
  ...createBiRoute('IDTPP', 'CNSZX', 120, 1000, 1.1), // Direct Indo to China

  // South China Sea
  ...createBiRoute('SGSIN', 'CNSZX', 96, 800, 1.5), // High traffic SCS
  ...createBiRoute('MYPKG', 'CNSZX', 110, 900, 1.4), 
  
  // China Coast Core
  ...createBiRoute('CNSZX', 'CNSHG', 48, 400, 1),
  ...createBiRoute('CNSHG', 'CNNGB', 12, 100, 1),
  ...createBiRoute('CNSHG', 'KRPUS', 48, 300, 1),
  ...createBiRoute('CNNGB', 'JPTYO', 60, 450, 1),
  ...createBiRoute('KRPUS', 'JPTYO', 48, 400, 1),

  // Trans-Pacific
  ...createBiRoute('CNSHG', 'USLAX', 360, 2200, 1.2),
  ...createBiRoute('JPTYO', 'USLAX', 280, 1800, 1.1),
  ...createBiRoute('CNSZX', 'USLAX', 380, 2400, 1.3),

  // Americas / Trans-Atlantic
  ...createBiRoute('USLAX', 'PABLB', 180, 1200, 1.1),
  ...createBiRoute('PABLB', 'USNYC', 120, 1000, 1.8), // Panama transit risk
  ...createBiRoute('USNYC', 'NLRTM', 200, 1600, 1.2)
];
