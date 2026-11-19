/**
 * Search Engine for Shagun Mart
 * Zero-dependency, high-performance in-memory product search engine.
 * Handles normalization, tokenization, compound words, typo-tolerance (Damerau-Levenshtein),
 * phonetic normalization, dynamic synonyms, multi-field ranking, and lean caching.
 */

import Product from '../models/Product.js';
import StoreSetting from '../models/StoreSetting.js';

// --- STARTER / DEFAULT SYNONYMS ---
export const DEFAULT_SYNONYMS = {
  mamaearth: ['mama earth', 'mamaarth', 'mamearth', 'mamarth'],
  soap: ['saabun', 'sabun', 'bath soap'],
  facewash: ['face wash', 'face cleanser', 'face cleaner'],
  kajal: ['kajol', 'kohl', 'surma'],
  lotion: ['lotoin', 'body lotion', 'moisturizer', 'moisturiser'],
  cream: ['crem', 'creme', 'malai'],
  ponds: ["pond's", 'pond'],
  vaseline: ['vaslin', 'veseline'],
  shampoo: ['shampu', 'hair wash'],
  oil: ['tel', 'hair oil'],
  detergent: ['surf', 'washing powder']
};

// --- COMPOUND WORDS (joined <-> split) ---
const COMMON_COMPOUNDS = [
  ['facewash', 'face wash'],
  ['bodywash', 'body wash'],
  ['handwash', 'hand wash'],
  ['hairwash', 'hair wash'],
  ['sunscreen', 'sun screen'],
  ['lipbalm', 'lip balm'],
  ['eyeliner', 'eye liner'],
  ['nailpolish', 'nail polish'],
  ['hairoil', 'hair oil'],
  ['bodylotion', 'body lotion']
];

// --- MODULE-LEVEL LEAN CACHE (60s TTL) ---
let cachedProducts = null;
let cacheExpiresAt = 0;
let cachedSynonyms = null;
let synonymsExpiresAt = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateSearchCache() {
  cachedProducts = null;
  cacheExpiresAt = 0;
}

export function invalidateSynonymsCache() {
  cachedSynonyms = null;
  synonymsExpiresAt = 0;
}

/**
 * Text normalizer:
 * - Lowercase, trim
 * - Strips accents
 * - Squashes 3+ repeated characters down to 1 (e.g. sooooap -> soap)
 * - Standardizes numbers + units (e.g. "400 ml" -> "400ml", "50 gm" -> "50g")
 * - Strips punctuation, preserves alphanumeric and spaces
 */
export function normalizeText(input) {
  if (!input || typeof input !== 'string') return '';
  let str = input.toLowerCase().trim();

  // Strip unicode accents
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Squash 3+ consecutive duplicate characters to 1 (e.g. sooooap -> soap, faaaace -> face)
  str = str.replace(/(.)\1{2,}/g, '$1');

  // Standardize numbers & units (400 ml -> 400ml, 50 gm -> 50g, 1 ltr -> 1l)
  str = str.replace(/\b(\d+)\s*(ml|g|gm|kg|ltr|l|oz|pc|pcs|pack)\b/g, (match, num, unit) => {
    let u = unit;
    if (u === 'gm') u = 'g';
    if (u === 'ltr') u = 'l';
    if (u === 'pcs') u = 'pc';
    return `${num}${u}`;
  });

  // Strip punctuation, keep alphanumeric, spaces
  str = str.replace(/[^a-z0-9\s]/g, ' ');

  // Collapse multiple spaces
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Phonetic-ish Indian normalizer for common variant vowels and consonants
 */
export function phoneticKey(word) {
  if (!word || word.length < 3) return word;
  let s = word;
  // Duplicate consonants
  s = s.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1');
  // Common vowel/phonetic mappings
  s = s.replace(/ee/g, 'i')
       .replace(/oo/g, 'u')
       .replace(/ph/g, 'f')
       .replace(/ck/g, 'k')
       .replace(/c(?=[eiy])/g, 's')
       .replace(/c/g, 'k')
       .replace(/th/g, 't')
       .replace(/dh/g, 'd')
       .replace(/bh/g, 'b')
       .replace(/kh/g, 'k')
       .replace(/gh/g, 'g');
  return s;
}

// Reusable row buffers for edit distance (max query token len is guarded <= 30)
const prevPrevRow = new Int32Array(64);
const prevRow = new Int32Array(64);
const currentRow = new Int32Array(64);

/**
 * Damerau-Levenshtein Distance (insert, delete, replace, transpose)
 * Zero-allocation Int32Array implementation
 */
export function editDistance(a, b) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  // Ensure 'a' is shorter for space efficiency
  if (al > bl) return editDistance(b, a);
  if (bl >= 63) return 99;

  for (let j = 0; j <= bl; j++) prevRow[j] = j;

  for (let i = 1; i <= al; i++) {
    currentRow[0] = i;
    const charA = a.charCodeAt(i - 1);

    for (let j = 1; j <= bl; j++) {
      const charB = b.charCodeAt(j - 1);
      const cost = charA === charB ? 0 : 1;

      let min = prevRow[j] + 1; // deletion
      const insertion = currentRow[j - 1] + 1;
      if (insertion < min) min = insertion;
      const substitution = prevRow[j - 1] + cost;
      if (substitution < min) min = substitution;

      // Transposition
      if (i > 1 && j > 1 && charA === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === charB) {
        const transposition = prevPrevRow[j - 2] + 1;
        if (transposition < min) min = transposition;
      }

      currentRow[j] = min;
    }

    for (let j = 0; j <= bl; j++) {
      prevPrevRow[j] = prevRow[j];
      prevRow[j] = currentRow[j];
    }
  }

  return currentRow[bl];
}

/**
 * Determine allowable edit errors based on token length:
 * - <= 3 chars: 0 errors
 * - 4-6 chars: 1 error
 * - >= 7 chars: 2 errors
 */
export function maxAllowedErrors(len) {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

/**
 * Expand query tokens with compound words and synonyms
 */
export function expandTokens(tokens, synonymMap) {
  const expanded = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const variants = new Set([token]);
    const phraseSynonyms = [];

    // 1. Plural / Singular stripping
    if (token.endsWith('s') && token.length > 3) {
      variants.add(token.slice(0, -1));
    } else {
      variants.add(token + 's');
    }

    // 2. Synonyms expansion
    if (synonymMap) {
      for (const [canonical, synList] of Object.entries(synonymMap)) {
        const normCanonical = normalizeText(canonical);
        const normSynList = (Array.isArray(synList) ? synList : []).map(s => normalizeText(s));
        const allSyns = [normCanonical, ...normSynList];

        if (allSyns.some(s => s === token || s === token.slice(0, -1))) {
          allSyns.forEach(s => {
            if (s.includes(' ')) {
              // Multi-word phrase synonym (e.g. "body lotion", "bath soap")
              phraseSynonyms.push(s);
            } else if (s && s !== token) {
              variants.add(s);
            }
          });
        }
      }
    }

    expanded.push({
      original: token,
      variants: Array.from(variants),
      phraseSynonyms
    });
  }

  // 3. Compounds check (e.g. "face" and "wash" -> "facewash")
  for (let i = 0; i < tokens.length - 1; i++) {
    const joined = tokens[i] + tokens[i + 1];
    for (const [comp, split] of COMMON_COMPOUNDS) {
      if (joined === comp || `${tokens[i]} ${tokens[i + 1]}` === split) {
        expanded[i].variants.push(comp);
        expanded[i + 1].variants.push(comp);
      }
    }
  }

  return expanded;
}

/**
 * Fetch or get cached searchable product list
 */
export async function getSearchableCatalog(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && now < cacheExpiresAt) {
    return cachedProducts;
  }

  const raw = await Product.find({ isDeleted: { $ne: true } })
    .populate('brand_id', 'name slug logo')
    .lean();

  cachedProducts = raw.map(p => {
    const brandName = typeof p.brand_id === 'object' && p.brand_id ? (p.brand_id.name || '') : (p.brand || '');
    const nameClean = normalizeText(p.name);
    const brandClean = normalizeText(brandName);
    const catClean = normalizeText(p.category);
    const descClean = normalizeText(p.description);

    const nameTokensSet = new Set(nameClean.split(' ').filter(Boolean));
    for (const t of Array.from(nameTokensSet)) {
      const m = t.match(/^(\d+)(ml|g|gm|kg|ltr|l|oz|pc|pcs|pack)$/);
      if (m) {
        nameTokensSet.add(m[1]);
        nameTokensSet.add(m[2]);
      }
    }
    for (const [comp, split] of COMMON_COMPOUNDS) {
      if (nameClean.includes(split)) {
        nameTokensSet.add(comp);
      }
      if (nameClean.includes(comp)) {
        split.split(' ').forEach(w => nameTokensSet.add(w));
      }
    }

    const brandTokensSet = new Set(brandClean.split(' ').filter(Boolean));
    const categoryTokensSet = new Set(catClean.split(' ').filter(Boolean));

    return {
      _id: String(p._id),
      name: p.name,
      nameClean,
      nameTokens: Array.from(nameTokensSet),
      nameTokensSet,
      brandName,
      brandClean,
      brandTokens: Array.from(brandTokensSet),
      brandTokensSet,
      category: p.category || '',
      categoryClean: catClean,
      categoryTokens: Array.from(categoryTokensSet),
      categoryTokensSet,
      descClean,
      price: p.price,
      mrp: p.mrp,
      stock: typeof p.stock === 'number' ? p.stock : 0,
      image: p.image || '',
      images: p.images || [],
      rating: p.rating || 0,
      reviews: p.reviews || 0,
      isBestseller: Boolean(p.isBestseller),
      isFeatured: Boolean(p.isFeatured),
      isDraft: Boolean(p.isDraft),
      isDeleted: Boolean(p.isDeleted),
      createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
      rawProduct: p
    };
  });

  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedProducts;
}

/**
 * Fetch or get cached synonyms from StoreSetting
 */
export async function getSynonymsMap() {
  const now = Date.now();
  if (cachedSynonyms && now < synonymsExpiresAt) {
    return cachedSynonyms;
  }

  try {
    const setting = await StoreSetting.findOne({ key: 'search_synonyms' }).lean();
    if (setting && setting.value && typeof setting.value === 'object') {
      cachedSynonyms = { ...DEFAULT_SYNONYMS, ...setting.value };
    } else {
      cachedSynonyms = { ...DEFAULT_SYNONYMS };
    }
  } catch (err) {
    cachedSynonyms = { ...DEFAULT_SYNONYMS };
  }

  synonymsExpiresAt = now + CACHE_TTL_MS;
  return cachedSynonyms;
}

/**
 * Core Search Scoring & Matching Engine
 */
export async function searchProducts(rawQuery, options = {}) {
  const startTime = Date.now();
  const {
    category = null,
    brand = null,
    page = 1,
    limit = 20,
    includeDrafts = false,
    catalog = null // In-memory testing support
  } = options;

  // 1. Guard query length (cap at 80)
  const trimmed = String(rawQuery || '').slice(0, 80).trim();
  const normalizedQuery = normalizeText(trimmed);

  // If search query is empty, return standard filtered list
  const products = catalog || (await getSearchableCatalog());
  const synonymMap = await getSynonymsMap();

  let targetList = products.filter(p => {
    if (p.isDeleted) return false;
    if (!includeDrafts && p.isDraft) return false;
    if (category && category !== 'All' && p.category !== category) return false;
    if (brand && brand !== 'All') {
      const matchBrand = p.brandClean === normalizeText(brand) ||
                         (typeof p.rawProduct?.brand_id === 'object' && p.rawProduct?.brand_id?._id === brand);
      if (!matchBrand) return false;
    }
    return true;
  });

  if (!normalizedQuery) {
    // No search query: sort by createdAt descending
    const sorted = [...targetList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const paginated = sorted.slice((page - 1) * limit, page * limit).map(p => p.rawProduct);
    return {
      results: paginated,
      totalCount: sorted.length,
      mode: 'exact',
      correctedQuery: '',
      elapsedMs: Date.now() - startTime
    };
  }

  // Expand compound words in query (e.g. facewash -> face wash)
  let queryForTokens = normalizedQuery;
  for (const [comp, split] of COMMON_COMPOUNDS) {
    const r = new RegExp(`\\b${comp}\\b`, 'g');
    queryForTokens = queryForTokens.replace(r, split);
  }

  const rawTokens = queryForTokens.split(' ').filter(Boolean).slice(0, 6);
  if (rawTokens.length === 0) {
    return {
      results: [],
      totalCount: 0,
      mode: 'exact',
      correctedQuery: '',
      elapsedMs: Date.now() - startTime
    };
  }

  let tokenGroups = expandTokens(rawTokens, synonymMap);

  const scoredList = [];
  let typoCorrections = new Map(); // token -> correctedWord
  let maxTokensMatchedCount = 0;

  for (const p of targetList) {
    let score = 0;
    let matchedTokensCount = 0;
    let hasFuzzy = false;

    // Full query checks
    if (p.nameClean === normalizedQuery) {
      score += 100;
    } else if (p.nameClean.includes(normalizedQuery)) {
      score += 70;
    }

    // Match each token group
    for (let tIdx = 0; tIdx < tokenGroups.length; tIdx++) {
      const group = tokenGroups[tIdx];
      const isLastToken = tIdx === tokenGroups.length - 1;
      let tokenBestScore = 0;
      let matchedTokenWord = null;

      // 1. Check exact match of original token in name
      if (p.nameTokensSet ? p.nameTokensSet.has(group.original) : p.nameTokens.includes(group.original)) {
        tokenBestScore = 40;
        matchedTokenWord = group.original;
      }

      // 2. Check phrase synonyms (e.g. "body lotion" for "lotion")
      if (group.phraseSynonyms && group.phraseSynonyms.length > 0) {
        for (const phrase of group.phraseSynonyms) {
          if (p.nameClean.includes(phrase) || p.categoryClean.includes(phrase)) {
            tokenBestScore = Math.max(tokenBestScore, 32);
            matchedTokenWord = phrase;
            hasFuzzy = true;
          }
        }
      }

      // 3. Check variants (plurals, single-word synonyms, compounds)
      for (const variant of group.variants) {
        if (p.nameTokensSet ? p.nameTokensSet.has(variant) : p.nameTokens.includes(variant)) {
          const vScore = variant === group.original ? 40 : 28;
          if (vScore > tokenBestScore) {
            tokenBestScore = vScore;
            matchedTokenWord = variant;
            if (variant !== group.original) hasFuzzy = true;
          }
        }

        // Prefix match in name (especially for last token as user types)
        if (tokenBestScore < 28) {
          if (p.nameTokens.some(nt => nt.startsWith(variant))) {
            const pScore = isLastToken ? 28 : 22;
            if (pScore > tokenBestScore) {
              tokenBestScore = pScore;
              matchedTokenWord = variant;
              if (variant !== group.original) hasFuzzy = true;
            }
          }
        }

        // Exact match in brand
        if (p.brandTokensSet ? p.brandTokensSet.has(variant) : (p.brandTokens.includes(variant) || p.brandClean === variant)) {
          tokenBestScore = Math.max(tokenBestScore, 35);
          matchedTokenWord = p.brandClean || variant;
          if (variant !== group.original && p.brandClean !== group.original) hasFuzzy = true;
        }

        // Exact match in category
        if (p.categoryTokensSet ? p.categoryTokensSet.has(variant) : (p.categoryTokens.includes(variant) || p.categoryClean === variant)) {
          tokenBestScore = Math.max(tokenBestScore, 25);
          matchedTokenWord = p.categoryClean || variant;
          if (variant !== group.original) hasFuzzy = true;
        }

        // Match in description
        if (tokenBestScore < 10 && p.descClean.includes(variant)) {
          tokenBestScore = Math.max(tokenBestScore, 10);
          if (variant !== group.original) hasFuzzy = true;
        }
      }

      // 4. Phonetic match
      if (tokenBestScore < 25 && group.original.length >= 3) {
        const vPhonetic = phoneticKey(group.original);
        for (const nt of p.nameTokens) {
          if (phoneticKey(nt) === vPhonetic) {
            tokenBestScore = Math.max(tokenBestScore, 22);
            matchedTokenWord = nt;
            hasFuzzy = true;
            break;
          }
        }
        if (tokenBestScore < 22 && p.brandClean && phoneticKey(p.brandClean) === vPhonetic) {
          tokenBestScore = Math.max(tokenBestScore, 22);
          matchedTokenWord = p.brandClean;
          hasFuzzy = true;
        }
      }

      // 5. Fuzzy edit-distance match on user's original query token
      const maxErrors = maxAllowedErrors(group.original.length);
      if (tokenBestScore < 20 && maxErrors > 0) {
        const orig = group.original;
        const oLen = orig.length;

        for (const nt of p.nameTokens) {
          if (Math.abs(nt.length - oLen) <= maxErrors) {
            const dist = editDistance(orig, nt);
            if (dist <= maxErrors) {
              const fScore = dist === 1 ? 20 : 12;
              if (fScore > tokenBestScore) {
                tokenBestScore = fScore;
                matchedTokenWord = nt;
                hasFuzzy = true;
              }
            }
          }
        }

        if (tokenBestScore < 18) {
          for (const bt of p.brandTokens) {
            if (Math.abs(bt.length - oLen) <= maxErrors) {
              const dist = editDistance(orig, bt);
              if (dist <= maxErrors) {
                const fScore = dist === 1 ? 18 : 10;
                if (fScore > tokenBestScore) {
                  tokenBestScore = fScore;
                  matchedTokenWord = bt;
                  hasFuzzy = true;
                }
              }
            }
          }
        }

        if (tokenBestScore < 16) {
          for (const ct of p.categoryTokens) {
            if (Math.abs(ct.length - oLen) <= maxErrors) {
              const dist = editDistance(orig, ct);
              if (dist <= maxErrors) {
                const fScore = dist === 1 ? 16 : 8;
                if (fScore > tokenBestScore) {
                  tokenBestScore = fScore;
                  matchedTokenWord = ct;
                  hasFuzzy = true;
                }
              }
            }
          }
        }
      }

      if (tokenBestScore > 0) {
        score += tokenBestScore;
        matchedTokensCount++;
        if (matchedTokenWord && matchedTokenWord !== group.original && !group.variants.includes(matchedTokenWord)) {
          if (!typoCorrections.has(group.original)) {
            typoCorrections.set(group.original, matchedTokenWord);
          }
        }
      }
    }

    if (matchedTokensCount > 0) {
      if (matchedTokensCount > maxTokensMatchedCount) {
        maxTokensMatchedCount = matchedTokensCount;
      }

      // Bonus if all tokens matched
      if (matchedTokensCount === tokenGroups.length) {
        score += 50;
      }

      // Stock and feature boosts / penalties
      if (p.stock > 0) {
        score += 20;
      } else {
        score -= 50;
      }
      if (p.isFeatured) score += 10;

      scoredList.push({
        product: p,
        score,
        matchedTokensCount,
        hasFuzzy
      });
    }
  }

  // Mode resolution:
  // If we found products where ALL tokens matched: strict AND mode
  const allTokensMatched = scoredList.filter(item => item.matchedTokensCount === tokenGroups.length);
  let finalCandidates = [];
  let mode = 'exact';

  if (allTokensMatched.length > 0) {
    finalCandidates = allTokensMatched;
    const anyFuzzy = allTokensMatched.some(item => item.hasFuzzy);
    mode = anyFuzzy ? 'fuzzy' : 'exact';
  } else if (scoredList.length > 0) {
    // Fallback: Partial / OR matching (most tokens matched)
    finalCandidates = scoredList.filter(item => item.matchedTokensCount === maxTokensMatchedCount);
    mode = 'partial';
  }

  // Deterministic tie-break sorting:
  // 1. score descending
  // 2. name ascending
  // 3. _id ascending
  finalCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameDiff = a.product.name.localeCompare(b.product.name);
    if (nameDiff !== 0) return nameDiff;
    return a.product._id.localeCompare(b.product._id);
  });

  // Calculate corrected query string
  let correctedQuery = '';
  if (typoCorrections.size > 0 && finalCandidates.length > 0) {
    correctedQuery = rawTokens.map(t => typoCorrections.get(t) || t).join(' ');
    if (correctedQuery === normalizedQuery) correctedQuery = '';
  }

  const paginated = finalCandidates.slice((page - 1) * limit, page * limit).map(i => i.product.rawProduct);

  return {
    results: paginated,
    totalCount: finalCandidates.length,
    mode,
    correctedQuery,
    elapsedMs: Date.now() - startTime
  };
}

/**
 * Suggestions generator for GET /api/products/suggest?q=
 * Returns max 8 items: top products, matching brands, categories, and "did you mean" query.
 */
export async function getSuggestions(rawQuery, catalog = null) {
  const trimmed = String(rawQuery || '').slice(0, 80).trim();
  const normalized = normalizeText(trimmed);

  if (!normalized) {
    return {
      products: [],
      brands: [],
      categories: [],
      didYouMean: ''
    };
  }

  const searchRes = await searchProducts(normalized, { page: 1, limit: 4, catalog });
  const products = catalog || (await getSearchableCatalog());

  // Extract matching brand names
  const brandSet = new Set();
  const catSet = new Set();

  for (const p of products) {
    if (p.isDeleted || p.isDraft) continue;
    if (p.brandClean && (p.brandClean.includes(normalized) || editDistance(p.brandClean, normalized) <= 1)) {
      brandSet.add(p.brandName);
    }
    if (p.categoryClean && (p.categoryClean.includes(normalized) || editDistance(p.categoryClean, normalized) <= 1)) {
      catSet.add(p.category);
    }
  }

  const productSuggestions = searchRes.results.slice(0, 4).map(p => ({
    _id: String(p._id),
    name: p.name,
    category: p.category,
    price: p.price,
    image: p.image || ''
  }));

  return {
    products: productSuggestions,
    brands: Array.from(brandSet).slice(0, 3),
    categories: Array.from(catSet).slice(0, 3),
    didYouMean: searchRes.correctedQuery || ''
  };
}
