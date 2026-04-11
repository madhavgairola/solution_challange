// Centralized Port Database spanning 60+ major global hubs
export const PORTS = [
  // --- NORTH AMERICA ---
  { id: 'CAVAN', name: 'Vancouver', region: 'NA West', capacity: 60, status: 'active', lat: 49.28, lng: -123.12 },
  { id: 'USSEA', name: 'Seattle', region: 'NA West', capacity: 55, status: 'active', lat: 47.6, lng: -122.33 },
  { id: 'USLAX', name: 'Los Angeles/Long Beach', region: 'NA West', capacity: 100, status: 'active', lat: 33.75, lng: -118.25 },
  { id: 'MXZLO', name: 'Manzanillo', region: 'NA West / Central', capacity: 50, status: 'active', lat: 19.05, lng: -104.3 },
  { id: 'USHOU', name: 'Houston', region: 'NA Gulf', capacity: 70, status: 'active', lat: 29.75, lng: -95.36, ocean_lat: 29.2, ocean_lng: -94.7 },
  { id: 'USMIA', name: 'Miami', region: 'NA East', capacity: 65, status: 'active', lat: 25.76, lng: -80.19 },
  { id: 'USSAV', name: 'Savannah', region: 'NA East', capacity: 75, status: 'active', lat: 32.1, lng: -81.1 },
  { id: 'USNYC', name: 'New York/NJ', region: 'NA East', capacity: 90, status: 'active', lat: 40.65, lng: -74.05, ocean_lat: 40.4, ocean_lng: -73.8 },
  { id: 'CAHAL', name: 'Halifax', region: 'NA East', capacity: 45, status: 'active', lat: 44.64, lng: -63.57 },

  // --- LATIN AMERICA ---
  { id: 'PABLB', name: 'Balboa (Panama)', region: 'Central America', line_cap: 80, status: 'active', lat: 8.95, lng: -79.55 },
  { id: 'PECALL', name: 'Callao', region: 'SA West', capacity: 50, status: 'active', lat: -12.05, lng: -77.15 },
  { id: 'CLSPO', name: 'San Antonio', region: 'SA West', capacity: 45, status: 'active', lat: -33.6, lng: -71.6 },
  { id: 'BRSSZ', name: 'Santos', region: 'SA East', capacity: 75, status: 'active', lat: -23.95, lng: -46.3, ocean_lat: -24.05, ocean_lng: -46.2 },
  { id: 'ARBUE', name: 'Buenos Aires', region: 'SA East', capacity: 55, status: 'active', lat: -34.6, lng: -58.38, ocean_lat: -34.8, ocean_lng: -57.5 },

  // --- EUROPE ---
  { id: 'GBFXT', name: 'Felixstowe', region: 'North Europe', capacity: 75, status: 'active', lat: 51.95, lng: 1.25, ocean_lat: 51.9, ocean_lng: 1.5 },
  { id: 'FRLEH', name: 'Le Havre', region: 'North Europe', capacity: 65, status: 'active', lat: 49.5, lng: 0.1 },
  { id: 'BEANR', name: 'Antwerp', region: 'North Europe', capacity: 95, status: 'active', lat: 51.25, lng: 4.3, ocean_lat: 51.4, ocean_lng: 3.5 },
  { id: 'NLRTM', name: 'Rotterdam', region: 'North Europe', capacity: 100, status: 'active', lat: 51.95, lng: 4.1, ocean_lat: 52.0, ocean_lng: 3.8 },
  { id: 'DEHAM', name: 'Hamburg', region: 'North Europe', capacity: 85, status: 'active', lat: 53.55, lng: 9.95, ocean_lat: 54.0, ocean_lng: 8.0 },
  { id: 'ESALG', name: 'Algeciras (Gibraltar)', region: 'Mediterranean', capacity: 80, status: 'active', lat: 36.15, lng: -5.4 },
  { id: 'ESVLC', name: 'Valencia', region: 'Mediterranean', capacity: 65, status: 'active', lat: 39.45, lng: -0.3 },
  { id: 'ITGOA', name: 'Genoa', region: 'Mediterranean', capacity: 60, status: 'active', lat: 44.4, lng: 8.9 },
  { id: 'GRPIR', name: 'Piraeus', region: 'Mediterranean', capacity: 70, status: 'active', lat: 37.95, lng: 23.6 },
  { id: 'EGPSD', name: 'Port Said (Suez)', region: 'Mediterranean / Middle East', capacity: 100, status: 'active', lat: 31.25, lng: 32.3 }, // Crucial Chokepoint

  // --- AFRICA ---
  { id: 'MAPTM', name: 'Tangier Med', region: 'North Africa', capacity: 75, status: 'active', lat: 35.9, lng: -5.5 },
  { id: 'SNDKR', name: 'Dakar', region: 'West Africa', capacity: 40, status: 'active', lat: 14.65, lng: -17.4 },
  { id: 'CIABJ', name: 'Abidjan', region: 'West Africa', capacity: 45, status: 'active', lat: 5.3, lng: -4.0 },
  { id: 'ZACPT', name: 'Cape Town', region: 'South Africa (Cape)', capacity: 60, status: 'active', lat: -33.9, lng: 18.4 },
  { id: 'ZADUR', name: 'Durban', region: 'South Africa', capacity: 65, status: 'active', lat: -29.85, lng: 31.0 },
  { id: 'TZDAR', name: 'Dar es Salaam', region: 'East Africa', capacity: 50, status: 'active', lat: -6.8, lng: 39.3 },
  { id: 'KEMBA', name: 'Mombasa', region: 'East Africa', capacity: 55, status: 'active', lat: -4.0, lng: 39.6 },
  { id: 'DJJIB', name: 'Djibouti', region: 'Horn of Africa', capacity: 55, status: 'active', lat: 11.6, lng: 43.15 },

  // --- MIDDLE EAST ---
  { id: 'SAJED', name: 'Jeddah', region: 'Red Sea', capacity: 65, status: 'active', lat: 21.45, lng: 39.15 },
  { id: 'SAKEC', name: 'King Abdullah Port', region: 'Red Sea', capacity: 70, status: 'active', lat: 22.5, lng: 39.1 },
  { id: 'OMSAL', name: 'Salalah', region: 'Arabian Sea', capacity: 75, status: 'active', lat: 16.95, lng: 54.0 },
  { id: 'AEDXB', name: 'Jebel Ali (Dubai)', region: 'Persian Gulf', capacity: 95, status: 'active', lat: 25.0, lng: 55.05 },
  { id: 'QAHMD', name: 'Hamad Port', region: 'Persian Gulf', capacity: 60, status: 'active', lat: 25.0, lng: 51.6 },
  { id: 'SADMM', name: 'Dammam', region: 'Persian Gulf', capacity: 60, status: 'active', lat: 26.5, lng: 50.15 },

  // --- SOUTH ASIA ---
  { id: 'PKKHI', name: 'Karachi', region: 'South Asia', capacity: 60, status: 'active', lat: 24.8, lng: 66.95, ocean_lat: 24.6, ocean_lng: 66.8 },
  { id: 'INNSA', name: 'Nhava Sheva / Mumbai', region: 'South Asia', capacity: 85, status: 'active', lat: 18.95, lng: 72.95, ocean_lat: 18.9, ocean_lng: 72.8 },
  { id: 'LKCMB', name: 'Colombo', region: 'South Asia', capacity: 90, status: 'active', lat: 6.95, lng: 79.85, ocean_lat: 6.9, ocean_lng: 79.7 },
  { id: 'INMAA', name: 'Chennai', region: 'South Asia', capacity: 70, status: 'active', lat: 13.1, lng: 80.3, ocean_lat: 13.1, ocean_lng: 80.5 },
  { id: 'BDCGP', name: 'Chittagong', region: 'South Asia', capacity: 50, status: 'active', lat: 22.3, lng: 91.8, ocean_lat: 22.1, ocean_lng: 91.6 },

  // --- SOUTHEAST ASIA ---
  { id: 'MYPKG', name: 'Port Klang', region: 'Malacca Strait', capacity: 90, status: 'active', lat: 3.0, lng: 101.35, ocean_lat: 2.9, ocean_lng: 101.2 },
  { id: 'MYTPP', name: 'Tanjung Pelepas', region: 'Malacca Strait', capacity: 95, status: 'active', lat: 1.35, lng: 103.55, ocean_lat: 1.25, ocean_lng: 103.55 },
  { id: 'SGSIN', name: 'Singapore', region: 'Global Hub', capacity: 100, status: 'active', lat: 1.25, lng: 103.8, ocean_lat: 1.15, ocean_lng: 103.85 },
  { id: 'IDJKT', name: 'Tanjung Priok (Jakarta)', region: 'Southeast Asia', capacity: 80, status: 'active', lat: -6.1, lng: 106.85 },
  { id: 'THLCH', name: 'Laem Chabang', region: 'Southeast Asia', capacity: 75, status: 'active', lat: 13.1, lng: 100.9 },
  { id: 'VNSGN', name: 'Ho Chi Minh', region: 'Southeast Asia', capacity: 65, status: 'active', lat: 10.75, lng: 106.75 },

  // --- EAST ASIA ---
  { id: 'HKHKG', name: 'Hong Kong', region: 'East Asia', capacity: 95, status: 'active', lat: 22.3, lng: 114.15 },
  { id: 'CNSZX', name: 'Shenzhen', region: 'East Asia', capacity: 100, status: 'active', lat: 22.55, lng: 113.9 },
  { id: 'CNXAM', name: 'Xiamen', region: 'East Asia', capacity: 80, status: 'active', lat: 24.5, lng: 118.05 },
  { id: 'CNNGB', name: 'Ningbo-Zhoushan', region: 'East Asia', capacity: 100, status: 'active', lat: 29.9, lng: 121.85 },
  { id: 'CNSHG', name: 'Shanghai', region: 'East Asia', capacity: 100, status: 'active', lat: 31.35, lng: 121.65, ocean_lat: 31.2, ocean_lng: 122.2 },
  { id: 'CNTAO', name: 'Qingdao', region: 'East Asia', capacity: 85, status: 'active', lat: 36.1, lng: 120.3 },
  { id: 'KRPUS', name: 'Busan', region: 'East Asia', capacity: 95, status: 'active', lat: 35.1, lng: 129.05 },
  { id: 'JPTYO', name: 'Tokyo', region: 'East Asia', capacity: 90, status: 'active', lat: 35.65, lng: 139.75 },
  { id: 'JPYOK', name: 'Yokohama', region: 'East Asia', capacity: 85, status: 'active', lat: 35.45, lng: 139.65 },
  { id: 'TWKHH', name: 'Kaohsiung', region: 'East Asia', capacity: 80, status: 'active', lat: 22.6, lng: 120.3 },

  // --- OCEANIA ---
  { id: 'AUBNE', name: 'Brisbane', region: 'Oceania', capacity: 55, status: 'active', lat: -27.35, lng: 153.15 },
  { id: 'AUSYD', name: 'Sydney', region: 'Oceania', capacity: 65, status: 'active', lat: -33.95, lng: 151.2 },
  { id: 'AUMEL', name: 'Melbourne', region: 'Oceania', capacity: 60, status: 'active', lat: -37.85, lng: 144.9 },
  { id: 'NZAKL', name: 'Auckland', region: 'Oceania', capacity: 50, status: 'active', lat: -36.85, lng: 174.75 },

  // --- OCEAN WAYPOINTS (Strictly curves geometry around continents) ---
  { id: 'WP_SCS', name: 'South China Sea Hub', status: 'waypoint', lat: 15.0, lng: 115.0 }, // Bridges TW/HK -> SG curving past Vietnam
  { id: 'WP_NPAC', name: 'North Pacific Sea Hub', status: 'waypoint', lat: 45.0, lng: 170.0 } // Central point for Trans-Pacific
];

// Helper to structure bidirectional routes cleanly
function createBiRoute(p1, p2, time, cost, risk, cap = 100) {
  return [
    { source: p1, destination: p2, base_time: time, base_cost: cost, base_risk: risk, capacity: cap },
    { source: p2, destination: p1, base_time: time, base_cost: cost, base_risk: risk, capacity: cap }
  ];
}

// Generate highly realistic, overlapping edge matrix spanning the globe
export const ROUTES = [
  // --- TRANS-PACIFIC (Asia <-> NA West) ---
  ...createBiRoute('CNSHG', 'WP_NPAC', 168, 750, 1),
  ...createBiRoute('WP_NPAC', 'USLAX', 168, 750, 1),
  ...createBiRoute('CNNGB', 'WP_NPAC', 170, 725, 1),
  ...createBiRoute('WP_NPAC', 'CAVAN', 140, 600, 1),
  ...createBiRoute('JPTYO', 'WP_NPAC', 100, 500, 1),
  
  ...createBiRoute('KRPUS', 'USLAX', 300, 1300, 2),
  ...createBiRoute('CNSZX', 'USLAX', 360, 1600, 2),
  ...createBiRoute('TWKHH', 'USLAX', 350, 1550, 2),
  ...createBiRoute('CNSHG', 'MXZLO', 360, 1600, 2),

  // --- ASIA INTERNAL ---
  // North Asia to South China
  ...createBiRoute('KRPUS', 'CNSHG', 48, 200, 1),
  ...createBiRoute('KRPUS', 'JPTYO', 36, 180, 1),
  ...createBiRoute('JPYOK', 'JPTYO', 12, 50, 1),
  ...createBiRoute('CNTAO', 'CNSHG', 48, 250, 1),
  ...createBiRoute('CNNGB', 'CNSHG', 12, 80, 1),
  ...createBiRoute('CNSHG', 'CNXAM', 36, 180, 1),
  ...createBiRoute('CNXAM', 'TWKHH', 24, 150, 1),
  ...createBiRoute('TWKHH', 'HKHKG', 24, 150, 1),
  ...createBiRoute('HKHKG', 'CNSZX', 12, 50, 1),
  
  // South China to SE Asia via Ocean Waypoint (Contouring Vietnam safely)
  ...createBiRoute('CNSZX', 'WP_SCS', 48, 200, 1),
  ...createBiRoute('HKHKG', 'WP_SCS', 48, 200, 1),
  ...createBiRoute('TWKHH', 'WP_SCS', 50, 220, 1),
  ...createBiRoute('WP_SCS', 'VNSGN', 24, 100, 1),
  ...createBiRoute('WP_SCS', 'SGSIN', 60, 280, 1),
  
  // SE Asia Hub Triangle
  ...createBiRoute('VNSGN', 'SGSIN', 48, 250, 1),
  ...createBiRoute('THLCH', 'SGSIN', 60, 300, 1),
  ...createBiRoute('IDJKT', 'SGSIN', 48, 250, 1),
  ...createBiRoute('MYTPP', 'SGSIN', 12, 50, 1),
  ...createBiRoute('MYPKG', 'MYTPP', 24, 100, 1),
  ...createBiRoute('MYPKG', 'SGSIN', 36, 150, 1),

  // SE Asia to Oceania
  ...createBiRoute('SGSIN', 'AUBNE', 240, 1100, 2),
  ...createBiRoute('SGSIN', 'AUMEL', 260, 1200, 2),
  ...createBiRoute('SGSIN', 'AUSYD', 280, 1300, 2),
  ...createBiRoute('AUBNE', 'AUSYD', 48, 250, 1),
  ...createBiRoute('AUSYD', 'AUMEL', 48, 250, 1),
  ...createBiRoute('AUSYD', 'NZAKL', 72, 350, 1),

  // --- ASIA TO MIDDLE EAST & INDIA ---
  // The great Malacca transition
  ...createBiRoute('SGSIN', 'LKCMB', 96, 400, 2),
  ...createBiRoute('MYPKG', 'LKCMB', 84, 350, 2),
  ...createBiRoute('SGSIN', 'INMAA', 96, 450, 2),
  ...createBiRoute('BDCGP', 'SGSIN', 110, 500, 2),

  // India Coast
  ...createBiRoute('BDCGP', 'INMAA', 72, 350, 1),
  ...createBiRoute('INMAA', 'LKCMB', 36, 150, 1),
  // Removed direct Mumbai->Colombo to force coastal/hub hopping (Oman->Yemen->Sri Lanka logic)
  ...createBiRoute('INNSA', 'PKKHI', 48, 200, 2),

  // India/SL to Gulf & Red Sea
  // Colombo connects through Yemen (Djibouti) and Oman (Salalah)
  ...createBiRoute('LKCMB', 'DJJIB', 120, 550, 3), 
  ...createBiRoute('LKCMB', 'OMSAL', 110, 500, 3), 
  ...createBiRoute('INNSA', 'OMSAL', 72, 350, 2), // Mumbai strongly prefers connecting to Oman
  ...createBiRoute('INNSA', 'AEDXB', 96, 450, 2),
  ...createBiRoute('PKKHI', 'AEDXB', 72, 300, 2),
  
  // Gulf Internal
  ...createBiRoute('AEDXB', 'QAHMD', 36, 150, 1),
  ...createBiRoute('QAHMD', 'SADMM', 24, 100, 1),
  ...createBiRoute('AEDXB', 'OMSAL', 120, 500, 2), // Passing Hormuz

  // Red Sea / Gateway to Suez
  ...createBiRoute('OMSAL', 'SAJED', 110, 500, 3), 
  ...createBiRoute('OMSAL', 'DJJIB', 48, 200, 3), // Gulf of Aden
  ...createBiRoute('DJJIB', 'SAJED', 84, 400, 3),
  ...createBiRoute('SAJED', 'SAKEC', 24, 100, 1),
  ...createBiRoute('SAKEC', 'EGPSD', 72, 350, 1), // Up the Red Sea to Suez

  // --- THE SUEZ CANAL ---
  { source: 'EGPSD', destination: 'GRPIR', base_time: 48, base_cost: 600, base_risk: 3, capacity: 100 }, // Leaving Suez (one way logic isn't strict but useful for canal modeling, we'll keep bi for now)
  { source: 'GRPIR', destination: 'EGPSD', base_time: 48, base_cost: 600, base_risk: 3, capacity: 100 },

  // --- MEDITERRANEAN & EUROPE ---
  ...createBiRoute('EGPSD', 'ITGOA', 120, 600, 2),
  ...createBiRoute('GRPIR', 'ITGOA', 84, 400, 1),
  ...createBiRoute('GRPIR', 'ESVLC', 120, 600, 1),
  ...createBiRoute('ITGOA', 'ESVLC', 60, 300, 1),
  ...createBiRoute('ESVLC', 'ESALG', 48, 250, 1), // Over to Gibraltar
  ...createBiRoute('EGPSD', 'ESALG', 180, 800, 2), // Suez straight through Med to Gibraltar

  // Gibraltar to North Europe
  ...createBiRoute('ESALG', 'MAPTM', 12, 50, 1), // Cross Strait
  ...createBiRoute('ESALG', 'FRLEH', 120, 600, 3), // Bay of Biscay risk
  ...createBiRoute('MAPTM', 'FRLEH', 120, 600, 3),
  ...createBiRoute('ESALG', 'NLRTM', 144, 700, 3),
  ...createBiRoute('ESALG', 'GBFXT', 150, 750, 3),

  // North Europe Hubs
  ...createBiRoute('FRLEH', 'BEANR', 36, 150, 1),
  ...createBiRoute('BEANR', 'NLRTM', 24, 100, 1),
  ...createBiRoute('NLRTM', 'DEHAM', 48, 200, 1),
  ...createBiRoute('NLRTM', 'GBFXT', 24, 120, 1),
  ...createBiRoute('BEANR', 'GBFXT', 36, 150, 1),
  ...createBiRoute('FRLEH', 'GBFXT', 48, 200, 1),

  // --- TRANS-ATLANTIC ---
  ...createBiRoute('NLRTM', 'USNYC', 216, 1000, 2),
  ...createBiRoute('GBFXT', 'USNYC', 210, 950, 2),
  ...createBiRoute('FRLEH', 'USNYC', 200, 900, 2),
  ...createBiRoute('DEHAM', 'CAHAL', 220, 1050, 3), // Arctic weather risk
  ...createBiRoute('NLRTM', 'CAHAL', 190, 900, 3),
  
  ...createBiRoute('ESALG', 'USMIA', 240, 1100, 2),
  ...createBiRoute('ESALG', 'USSAV', 250, 1150, 2),
  ...createBiRoute('MAPTM', 'USMIA', 240, 1100, 2),

  // --- AMERICAS INTERNAL ---
  // NA East Coast
  ...createBiRoute('CAHAL', 'USNYC', 48, 250, 1),
  ...createBiRoute('USNYC', 'USSAV', 60, 300, 1),
  ...createBiRoute('USSAV', 'USMIA', 48, 250, 1),
  ...createBiRoute('USMIA', 'USHOU', 96, 450, 2),

  // LatAm / Panama
  ...createBiRoute('USMIA', 'PABLB', 120, 600, 2),
  ...createBiRoute('USHOU', 'PABLB', 144, 700, 2),
  ...createBiRoute('MXZLO', 'PABLB', 144, 700, 2),
  ...createBiRoute('USLAX', 'PABLB', 216, 1000, 2),
  
  // South America East
  ...createBiRoute('PABLB', 'BRSSZ', 360, 1700, 3), // around/through to Brazil
  ...createBiRoute('USMIA', 'BRSSZ', 330, 1550, 3), // direct US to Brazil
  ...createBiRoute('BRSSZ', 'ARBUE', 96, 450, 2),
  
  // South America West
  ...createBiRoute('PABLB', 'PECALL', 120, 600, 2),
  ...createBiRoute('PECALL', 'CLSPO', 144, 700, 2),

  // NA West Coast
  ...createBiRoute('CAVAN', 'USSEA', 12, 50, 1),
  ...createBiRoute('USSEA', 'USLAX', 72, 350, 2),
  ...createBiRoute('USLAX', 'MXZLO', 96, 450, 1),

  // --- CAPE OF GOOD HOPE (THE SUEZ BYPASS) ---
  // The ultimate fallback route when the canal is blocked
  ...createBiRoute('OMSAL', 'TZDAR', 192, 900, 4), // Salalah down Africa Coast
  ...createBiRoute('KEMBA', 'TZDAR', 24, 100, 1), // Mombasa
  ...createBiRoute('TZDAR', 'ZADUR', 144, 700, 3), // Dar es Salaam to Durban
  ...createBiRoute('ZADUR', 'ZACPT', 48, 250, 2), // Durban to Cape Town
  ...createBiRoute('LKCMB', 'ZADUR', 336, 1600, 3), // Colombo directly to Durban
  ...createBiRoute('SGSIN', 'ZACPT', 432, 2100, 3), // Singapore directly to Cape Town
  
  // West Africa
  ...createBiRoute('ZACPT', 'CIABJ', 240, 1100, 3),
  ...createBiRoute('CIABJ', 'SNDKR', 120, 600, 2),
  ...createBiRoute('SNDKR', 'MAPTM', 144, 700, 2),
  ...createBiRoute('ZACPT', 'MAPTM', 432, 2100, 3), // Cape Town straight to Tangier / Gibraltar
  ...createBiRoute('ZACPT', 'BRSSZ', 336, 1600, 3)  // Cape Town transatlantic to South America
];
