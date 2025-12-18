/**
 * vendorConfig.js
 * 
 * Centralized configuration for leased labor vendor normalization.
 * This file contains the canonical list of vendor names and regex patterns
 * for normalizing vendor names from various sources.
 * 
 * CANONICAL: The authoritative list of vendor display names
 * VENDOR_ALIASES: Regex patterns that map variations to canonical names
 */

/**
 * Canonical vendor names - the authoritative display names for all leased labor vendors
 * Keep this list alphabetically sorted for easier maintenance
 */
export const CANONICAL = Object.freeze([
  "7Twenty4 Services",
  "Beacon Hill Associates",
  "DUMANIS",
  "Eco Staffing",
  "Finish Line Staffing",
  "Flex Tech",
  "Fuse Staffing",
  "Hard Hat Staffing",
  "NCW",
  "Outsource",
  "People Source USA",
  "Premier Group",
  "Proman Skilled Trades",
  "Secured Services",
  "Talent Corp",
  "Tekk Force",
  "Texas Trades",
  "The Prohunters, LLC",
  "Trade Management",
  "X3 Tradesmen",
]);

/**
 * Vendor name aliases - regex patterns to normalize various name variations
 * Each entry is [RegExp pattern, Canonical name]
 * Patterns are case-insensitive (note the 'i' flag)
 */
export const VENDOR_ALIASES = Object.freeze([
  // 7Twenty4 Services (formerly 247 Employees)
  [
    /^(?:247|24\s*\/?\s*7|7\s*\/?\s*24|7\s*24|24\s*7|7\s*twenty\s*4|7twenty4|7twenty\-?four)\s*(?:employees?|services?)?$/i,
    "7Twenty4 Services",
  ],
  [/^24\/7 employees$/i, "7Twenty4 Services"],
  [/^7twenty4 services$/i, "7Twenty4 Services"],

  // Beacon Hill Associates
  [
    /^beacon hill(?: associates)?(?:,?\s*(?:llc|inc\.?)\b)?$/i,
    "Beacon Hill Associates",
  ],

  // DUMANIS (various spellings)
  [
    /^dumanis(?: cabdi)?(?: contractor)?(?: inc\.?)?$/i,
    "DUMANIS",
  ],
  [
    /^duman(?:i|e)s(?: cabdi)?(?: contractor)?(?: inc\.?)?$/i,
    "DUMANIS",
  ],
  [/^duminas$/i, "DUMANIS"],
  [/^dunamis(?: cabdi)?(?: contractor)?(?: inc\.?)?$/i, "DUMANIS"],

  // Eco Staffing
  [/^eco[\s\-]?staff(?:ing)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Eco Staffing"],
  [/^ecostaff(?:ing)?$/i, "Eco Staffing"],

  // Finish Line Staffing
  [/^finish\s*line(?:\s*staffing)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Finish Line Staffing"],

  // Flex Tech
  [/^flex\s*tech(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Flex Tech"],

  // Fuse Staffing
  [/^fuse(?:\s*staffing)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Fuse Staffing"],

  // Hard Hat Staffing
  [/^hard\s*hat(?:\s*staffing)?(?:\s*workforce)?(?:\s*solutions?)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Hard Hat Staffing"],
  [/^hardhat(?:\s*staffing)?(?:\s*work(?:force)?\s*solutions?)?$/i, "Hard Hat Staffing"],

  // NCW
  [/^ncw(?:,?\s*(?:llc|inc\.?)\b)?$/i, "NCW"],

  // Outsource
  [/^outsource(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Outsource"],

  // People Source USA
  [/^people\s*source(?:\s*usa)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "People Source USA"],
  [/^peoplesource(?:\s*usa)?$/i, "People Source USA"],

  // Premier Group
  [/^(?:the\s*)?premier\s*group(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Premier Group"],

  // Proman Skilled Trades
  [/^proman(?:\s*skilled\s*trades?)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Proman Skilled Trades"],
  [/^pro\s*man(?:\s*skilled\s*trades?)?$/i, "Proman Skilled Trades"],

  // Secured Services
  [/^secured\s*services?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Secured Services"],

  // Talent Corp
  [/^talen(?:t)?\s*corp(?:s)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Talent Corp"],

  // Tekk Force
  [/^tekk?\s*force(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Tekk Force"],

  // Texas Trades
  [/^texas\s*trades?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Texas Trades"],
  [/^texas\s*trade\s*management$/i, "Texas Trades"],

  // The Prohunters, LLC
  [/^(?:the\s*)?pro\s*hunters?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "The Prohunters, LLC"],
  [/^prohunters?$/i, "The Prohunters, LLC"],

  // Trade Management
  [/^trade\s*management(?:,?\s*(?:llc|inc\.?)\b)?$/i, "Trade Management"],

  // X3 Tradesmen
  [/^x3\s*trades(?:men)?(?:,?\s*(?:llc|inc\.?)\b)?$/i, "X3 Tradesmen"],
  [/^x\s*3\s*trades(?:men)?$/i, "X3 Tradesmen"],
]);

/**
 * Address-based vendor hints
 * Map address fragments to canonical vendor names when vendor name is unclear
 */
export const ADDRESS_VENDOR_HINTS = Object.freeze({
  // Add specific address patterns here if needed
  // Example: "1234 Main St": "Vendor Name"
});

/**
 * Stop words to ignore when creating vendor keys for fuzzy matching
 */
export const STOP_WORDS = Object.freeze(new Set([
  "llc",
  "l.l.c",
  "inc",
  "inc.",
  "ltd",
  "co",
  "company",
  "corporation",
  "corp",
  "group",
  "associates",
  "services",
  "solutions",
  "staffing",
  "skilled",
  "trades",
  "usa",
  "the",
]));

/**
 * Key patches for vendor key normalization
 * Applied before stop word removal for consistent matching
 */
export const KEY_PATCHES = Object.freeze([
  [/\bhard\s*hat\b/g, "hardhat"],
  [/\bpro\s*man\b/g, "proman"],
  [/\bpeople\s*source(?:\s*usa)?\b/g, "people source"],
  [/\beco\s*staff(?:ing)?\b/g, "eco staff"],
  [/\btexas\s*trade\s*management\b/g, "texas trades"],
  [
    /(?:247|24\s*[\/\-]?\s*7|7\s*[\/\-]?\s*24|7\s*twenty\s*4|7twentyfour|7\s*twenty\s*four)/g,
    "247employees",
  ],
  [/\bx\s*3\b/g, "x3"],
  [/\bncw\b/g, "ncw"],
]);
