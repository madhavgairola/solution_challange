export const PORTS = [
  // India
  { id: 'Mumbai', name: 'Mumbai', region: 'India Connections', lat: 18.95, lng: 72.95 },
  { id: 'Chennai', name: 'Chennai', region: 'India Connections', lat: 13.10, lng: 80.30 },
  // Sri Lanka
  { id: 'Colombo', name: 'Colombo', region: '🇱🇰 Colombo', lat: 6.95, lng: 79.85, ocean_lat: 6.0, ocean_lng: 79.0 },
  // Middle East
  { id: 'Dubai', name: 'Dubai (Jebel Ali)', region: 'Middle East', lat: 25.00, lng: 55.05 },
  { id: 'Dammam', name: 'Dammam', region: 'Middle East', lat: 26.50, lng: 50.15 },
  { id: 'Salalah', name: 'Salalah', region: 'Middle East', lat: 16.95, lng: 54.00 },
  // Jeddah
  { id: 'Jeddah', name: 'Jeddah (Red Sea)', region: '🇸🇦 Jeddah (Red Sea)', lat: 21.48, lng: 39.17 },
  // Port Said
  { id: 'Port Said', name: 'Port Said (Suez chokepoint)', region: '🇪🇬 Port Said (Suez chokepoint)', lat: 31.25, lng: 32.30 },
  // Southeast Asia
  { id: 'Singapore', name: 'Singapore', region: 'Southeast Asia', lat: 1.25, lng: 103.80 },
  { id: 'Port Klang', name: 'Port Klang', region: 'Southeast Asia', lat: 3.00, lng: 101.40 },
  { id: 'Tanjung Priok', name: 'Tanjung Priok', region: 'Southeast Asia', lat: -6.10, lng: 106.88 },
  // China
  { id: 'Shanghai', name: 'Shanghai', region: 'China', lat: 31.20, lng: 121.50 },
  { id: 'Shenzhen', name: 'Shenzhen', region: 'China', lat: 22.50, lng: 113.90 },
  { id: 'Ningbo', name: 'Ningbo', region: 'China', lat: 29.90, lng: 122.00 },
  // East Asia
  { id: 'Busan', name: 'Busan', region: 'East Asia', lat: 35.10, lng: 129.00 },
  { id: 'Tokyo', name: 'Tokyo', region: 'East Asia', lat: 35.60, lng: 139.70 },
  // Europe
  { id: 'Rotterdam', name: 'Rotterdam', region: 'Europe', lat: 51.90, lng: 4.10 },
  { id: 'Antwerp', name: 'Antwerp', region: 'Europe', lat: 51.30, lng: 4.30 },
  { id: 'Hamburg', name: 'Hamburg', region: 'Europe', lat: 53.50, lng: 9.90 },
  // Africa
  { id: 'Durban', name: 'Durban', region: 'Africa', lat: -29.80, lng: 31.00 },
  // North America
  { id: 'Los Angeles', name: 'Los Angeles', region: 'North America', lat: 33.75, lng: -118.25 },
  { id: 'New York', name: 'New York', region: 'North America', lat: 40.68, lng: -74.00 },
  // Panama
  { id: 'Balboa', name: 'Balboa (Panama)', region: 'Panama (Balboa)', lat: 8.95, lng: -79.56 }
];

export const PORT_GRAPH = {
  "Mumbai": [
    { to: "Dubai", time: 4, cost: 100, risk: 1.0 },
    { to: "Colombo", time: 2, cost: 60, risk: 1.0 },
    { to: "Durban", time: 12, cost: 200, risk: 1.0 }
  ],
  "Chennai": [
    { to: "Colombo", time: 1.5, cost: 50, risk: 1.0 },
    { to: "Singapore", time: 6, cost: 150, risk: 1.0 }
  ],
  "Colombo": [
    { to: "Mumbai", time: 2, cost: 60, risk: 1.0 },
    { to: "Chennai", time: 1.5, cost: 50, risk: 1.0 },
    { to: "Singapore", time: 5, cost: 120, risk: 1.0 }
  ],
  "Dubai": [
    { to: "Mumbai", time: 4, cost: 100, risk: 1.0 },
    { to: "Jeddah", time: 5, cost: 130, risk: 1.2 },
    { to: "Singapore", time: 8, cost: 200, risk: 1.0 },
    { to: "Dammam", time: 2, cost: 50, risk: 1.0 }
  ],
  "Dammam": [
    { to: "Dubai", time: 2, cost: 50, risk: 1.0 },
    { to: "Jeddah", time: 4, cost: 120, risk: 1.2 }
  ],
  "Salalah": [
    { to: "Jeddah", time: 3, cost: 90, risk: 1.5 },
    { to: "Mumbai", time: 5, cost: 120, risk: 1.0 }
  ],
  "Jeddah": [
    { to: "Dubai", time: 5, cost: 130, risk: 1.2 },
    { to: "Port Said", time: 4, cost: 110, risk: 2.0 },
    { to: "Salalah", time: 3, cost: 90, risk: 1.5 }
  ],
  "Port Said": [
    { to: "Jeddah", time: 4, cost: 110, risk: 2.0 },
    { to: "Rotterdam", time: 10, cost: 300, risk: 1.0 },
    { to: "Antwerp", time: 11, cost: 320, risk: 1.0 },
    { to: "Hamburg", time: 12, cost: 350, risk: 1.0 }
  ],
  "Singapore": [
    { to: "Chennai", time: 6, cost: 150, risk: 1.0 },
    { to: "Mumbai", time: 10, cost: 250, risk: 1.0 },
    { to: "Port Klang", time: 1, cost: 30, risk: 1.0 },
    { to: "Tanjung Priok", time: 2, cost: 60, risk: 1.0 },
    { to: "Shanghai", time: 6, cost: 160, risk: 1.2 },
    { to: "Shenzhen", time: 5, cost: 140, risk: 1.1 }
  ],
  "Port Klang": [
    { to: "Singapore", time: 1, cost: 30, risk: 1.0 },
    { to: "Tanjung Priok", time: 2, cost: 60, risk: 1.0 }
  ],
  "Tanjung Priok": [
    { to: "Singapore", time: 2, cost: 60, risk: 1.0 },
    { to: "Port Klang", time: 2, cost: 60, risk: 1.0 }
  ],
  "Shanghai": [
    { to: "Singapore", time: 6, cost: 160, risk: 1.2 },
    { to: "Busan", time: 2, cost: 60, risk: 1.0 },
    { to: "Los Angeles", time: 15, cost: 400, risk: 1.5 }
  ],
  "Shenzhen": [
    { to: "Singapore", time: 5, cost: 140, risk: 1.1 },
    { to: "Busan", time: 3, cost: 90, risk: 1.0 }
  ],
  "Ningbo": [
    { to: "Shanghai", time: 1, cost: 30, risk: 1.0 },
    { to: "Busan", time: 2.5, cost: 75, risk: 1.0 }
  ],
  "Busan": [
    { to: "Shanghai", time: 2, cost: 60, risk: 1.0 },
    { to: "Shenzhen", time: 3, cost: 90, risk: 1.0 },
    { to: "Ningbo", time: 2.5, cost: 75, risk: 1.0 },
    { to: "Tokyo", time: 1.5, cost: 50, risk: 1.0 }
  ],
  "Tokyo": [
    { to: "Busan", time: 1.5, cost: 50, risk: 1.0 },
    { to: "Los Angeles", time: 12, cost: 350, risk: 1.3 }
  ],
  "Rotterdam": [
    { to: "Port Said", time: 10, cost: 300, risk: 1.0 },
    { to: "Antwerp", time: 1, cost: 30, risk: 1.0 },
    { to: "New York", time: 8, cost: 240, risk: 1.2 }
  ],
  "Antwerp": [
    { to: "Port Said", time: 11, cost: 320, risk: 1.0 },
    { to: "Rotterdam", time: 1, cost: 30, risk: 1.0 }
  ],
  "Hamburg": [
    { to: "Port Said", time: 12, cost: 350, risk: 1.0 },
    { to: "Rotterdam", time: 2, cost: 60, risk: 1.0 }
  ],
  "Durban": [
    { to: "Mumbai", time: 12, cost: 200, risk: 1.0 },
    { to: "Rotterdam", time: 15, cost: 450, risk: 1.2 }
  ],
  "Los Angeles": [
    { to: "Shanghai", time: 15, cost: 400, risk: 1.5 },
    { to: "Tokyo", time: 12, cost: 350, risk: 1.3 },
    { to: "Balboa", time: 8, cost: 200, risk: 1.0 }
  ],
  "New York": [
    { to: "Rotterdam", time: 8, cost: 240, risk: 1.2 },
    { to: "Balboa", time: 6, cost: 180, risk: 1.4 }
  ],
  "Balboa": [
    { to: "Los Angeles", time: 8, cost: 200, risk: 1.0 },
    { to: "New York", time: 6, cost: 180, risk: 1.4 }
  ]
};

export const ROUTES = [];
for (const [source, targets] of Object.entries(PORT_GRAPH)) {
  targets.forEach(t => {
    ROUTES.push({
      source: source,
      destination: t.to,
      baseTime: t.time, // Core unit is now "days" instead of hours
      riskMultiplier: t.risk || 1,
      costBase: t.cost || 100,
      days: t.time
    });
  });
}
