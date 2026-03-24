/**
 * Faith & Encouragement — Centralized Content Registry
 *
 * Single source of truth for the per-page faith section shown on all
 * public-facing marketing pages.  Keyed by route path so the
 * <FaithSection /> component can look up content automatically.
 */

export interface FaithEntry {
  /** Small uppercase kicker label */
  kicker: string
  /** Prominent headline */
  headline: string
  /** Body paragraph */
  body: string
  /** Scripture text */
  verse: string
  /** Book / chapter:verse reference */
  reference: string
  /** Short closing line */
  closing: string
  /** Whether the standardized compliance disclosure renders below this section */
  showDisclosure: boolean
}

/**
 * Content keyed by route path.
 *
 * When a page's pathname is not found the lookup helper returns the
 * default (home) entry so every public page always has content.
 */
export const faithContent: Record<string, FaithEntry> = {
  "/": {
    kicker: "Faith & Purpose",
    headline: "We Proudly Honor Jesus Christ",
    body: "AutoLenis is a Christian-based company built on faith, integrity, and service. We proudly honor Jesus Christ as our Lord and Savior and believe every good thing begins with God. Our prayer is that this company reflects His truth, His love, and His standard of excellence in the way we serve people every day.",
    verse: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    reference: "John 3:16",
    closing: "Jesus died for us, rose again, and will return. We give Him the glory.",
    showDisclosure: true,
  },

  "/how-it-works": {
    kicker: "Faith & Guidance",
    headline: "God Directs the Path of Those Who Trust Him",
    body: "In a world filled with confusion, pressure, and uncertainty, we believe God is not the author of chaos but of wisdom and direction. Our desire is to build a process that reflects honesty, clarity, and peace\u2014while encouraging every person to place their trust first in the Lord.",
    verse: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
    reference: "Proverbs 3:5\u20136",
    closing: "True direction begins with trusting God.",
    showDisclosure: true,
  },

  "/pricing": {
    kicker: "Faith & Provision",
    headline: "God Is Faithful in Every Season",
    body: "We believe people should be treated with fairness, transparency, and dignity. Whether someone is planning, rebuilding, or taking their next step forward, our prayer is that they remember God is able to provide, sustain, and make a way even in difficult seasons.",
    verse: "But my God shall supply all your need according to his riches in glory by Christ Jesus.",
    reference: "Philippians 4:19",
    closing: "Your source is greater than your circumstance.",
    showDisclosure: true,
  },

  "/insurance": {
    kicker: "Faith & Security",
    headline: "Our Ultimate Security Is in God",
    body: "Wise planning matters, but our deepest confidence is never in money, contracts, or systems alone. It is in the Lord. We believe in being responsible stewards while remembering that God remains our protector, refuge, and strength.",
    verse: "God is our refuge and strength, a very present help in trouble.",
    reference: "Psalm 46:1",
    closing: "Plan wisely, but trust God fully.",
    showDisclosure: true,
  },

  "/refinance": {
    kicker: "Faith & Peace",
    headline: "God Gives Peace in the Middle of Pressure",
    body: "Financial decisions can bring stress and uncertainty, but God calls us to bring our burdens to Him. We want every person who visits this page to know that peace is found not only in better decisions, but in the presence of Christ.",
    verse: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    reference: "Matthew 11:28",
    closing: "There is rest in Jesus.",
    showDisclosure: true,
  },

  "/contract-shield": {
    kicker: "Faith & Wisdom",
    headline: "Ask God for Wisdom",
    body: "Discernment matters. Fine print matters. Truth matters. We believe people should move carefully, wisely, and honestly in every agreement they enter. Above all, we believe God gives wisdom to those who seek Him.",
    verse: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
    reference: "James 1:5",
    closing: "Pray first. Move with wisdom.",
    showDisclosure: true,
  },

  "/contact": {
    kicker: "Faith & Encouragement",
    headline: "God Sees You, Knows You, and Cares for You",
    body: "No matter what brought you here today, we want you to leave with this truth: God loves you, He sees you, and He has not forgotten you. Our hope is not only to serve people well, but to be a visible reminder of His goodness and grace.",
    verse: "Casting all your care upon him; for he careth for you.",
    reference: "1 Peter 5:7",
    closing: "You are not alone. God cares for you.",
    showDisclosure: false,
  },

  "/dealer-application": {
    kicker: "Faith & Integrity",
    headline: "God Honors Integrity",
    body: "We believe business should be conducted with honesty, fairness, and accountability. Our commitment is to build relationships and systems that reflect integrity, because how we deal with people matters to God.",
    verse: "A false balance is abomination to the Lord: but a just weight is his delight.",
    reference: "Proverbs 11:1",
    closing: "Integrity is not optional. It is worship in practice.",
    showDisclosure: true,
  },

  "/for-dealers": {
    kicker: "Faith & Integrity",
    headline: "God Honors Integrity",
    body: "We believe business should be conducted with honesty, fairness, and accountability. Our commitment is to build relationships and systems that reflect integrity, because how we deal with people matters to God.",
    verse: "A false balance is abomination to the Lord: but a just weight is his delight.",
    reference: "Proverbs 11:1",
    closing: "Integrity is not optional. It is worship in practice.",
    showDisclosure: true,
  },

  "/faq": {
    kicker: "Faith & Confidence",
    headline: "Let Faith Be Stronger Than Fear",
    body: "Questions are normal. Uncertainty is part of life. But fear does not have to lead. We believe peace, wisdom, and confidence grow when people anchor themselves in God.",
    verse: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
    reference: "2 Timothy 1:7",
    closing: "God brings clarity where fear brings confusion.",
    showDisclosure: false,
  },

  "/about": {
    kicker: "Faith & Purpose",
    headline: "We Proudly Honor Jesus Christ",
    body: "AutoLenis is a Christian-based company built on faith, integrity, and service. We proudly honor Jesus Christ as our Lord and Savior and believe every good thing begins with God. Our prayer is that this company reflects His truth, His love, and His standard of excellence in the way we serve people every day.",
    verse: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    reference: "John 3:16",
    closing: "Jesus died for us, rose again, and will return. We give Him the glory.",
    showDisclosure: true,
  },

  "/affiliate": {
    kicker: "Faith & Purpose",
    headline: "We Proudly Honor Jesus Christ",
    body: "AutoLenis is a Christian-based company built on faith, integrity, and service. We proudly honor Jesus Christ as our Lord and Savior and believe every good thing begins with God. Our prayer is that this company reflects His truth, His love, and His standard of excellence in the way we serve people every day.",
    verse: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    reference: "John 3:16",
    closing: "Jesus died for us, rose again, and will return. We give Him the glory.",
    showDisclosure: true,
  },

  "/feedback": {
    kicker: "Faith & Encouragement",
    headline: "God Sees You, Knows You, and Cares for You",
    body: "No matter what brought you here today, we want you to leave with this truth: God loves you, He sees you, and He has not forgotten you. Our hope is not only to serve people well, but to be a visible reminder of His goodness and grace.",
    verse: "Casting all your care upon him; for he careth for you.",
    reference: "1 Peter 5:7",
    closing: "You are not alone. God cares for you.",
    showDisclosure: false,
  },
}

/** Default entry used when a route has no dedicated content. */
export const defaultFaithEntry: FaithEntry = faithContent["/"]!

/**
 * Look up faith content for a given pathname.
 * Falls back to the default (home) entry when no exact match exists.
 */
export function getFaithContent(pathname: string): FaithEntry {
  return faithContent[pathname] ?? defaultFaithEntry
}

/** Standardized platform disclosure text. */
export const PLATFORM_DISCLOSURE =
  "AutoLenis is an automotive concierge platform that connects users with participating dealers, lenders, and service providers. We do not make loans, sell vehicles, or provide legal, tax, or financial advice. Financing and related services are subject to third-party approval, underwriting, and terms. AutoLenis does not guarantee approvals, rates, or specific outcomes. Please review all agreements carefully and consult qualified professionals regarding legal or financial decisions."
