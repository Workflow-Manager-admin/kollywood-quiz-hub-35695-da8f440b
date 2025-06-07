//
// TMDB API Utility for Kollywood Quiz Hub
//
// Reusable functions to fetch movie-related data from TMDB
//

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

// PUBLIC_INTERFACE
/**
 * Fetch movies filtered for Tamil (Kollywood) language/region.
 * You can enhance or paginate this as needed; this provides the basic search capability.
 * TMDB language code for Tamil is 'ta'.
 * @returns {Promise<Array>} List of Tamil movies
 */
export async function fetchKollywoodMovies() {
  // See: https://developer.themoviedb.org/reference/discover-movie
  const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Tamil movies from TMDB');
  }
  const data = await response.json();
  return data.results || [];
}

// PUBLIC_INTERFACE
/**
 * Generic TMDB API GET request (can be used to extend API usage)
 * @param {string} endpoint TMDB API endpoint (without base URL)
 * @param {object} params Query params as object
 * @returns {Promise<any>} API response
 */
export async function tmdbGet(endpoint, params = {}) {
  const searchParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params }).toString();
  const url = `${TMDB_BASE_URL}${endpoint}?${searchParams}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('TMDB API request failed');
  }
  return response.json();
}

