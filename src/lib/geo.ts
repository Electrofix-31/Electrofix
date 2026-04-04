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
