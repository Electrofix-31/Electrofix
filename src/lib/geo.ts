/**
 * Utilitaire pour le géocodage des adresses via l'API Nominatim (OpenStreetMap).
 * Respecte les conditions d'utilisation de Nominatim (limite de requêtes, user-agent).
 */

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!address) return null;

  try {
    // On ajoute "France" pour limiter les résultats si ce n'est pas précisé
    const query = encodeURIComponent(address.includes('France') ? address : `${address}, France`);
    
    // User-Agent obligatoire pour Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'ElectroFix-App/1.0 (contact: admin@electrofix.fr)',
        },
      }
    );

    if (!response.ok) {
      console.error('Nominatim API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Récupère les coordonnées centrales d'un code postal français via Nominatim.
 */
export async function getCoordinatesFromPostalCode(postalCode: string): Promise<{ lat: number; lon: number } | null> {
  if (!postalCode || postalCode.length !== 5) return null;
  
  // Utiliser geocodeAddress avec le code postal
  return geocodeAddress(`${postalCode}`);
}

/**
 * Calcule la distance entre deux points (Haversine) en kilomètres.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
