export interface Club {
  id: string;
  name: string;
  loft: number;
  carry: number;
  total: number;
  spin: number;
  tendency: 'Straight' | 'Draw' | 'Fade' | 'Slight Draw' | 'Slight Fade';
  confidence: number; // 1 to 5
}

export type LieType = 'Fairway' | 'First Cut' | 'Heavy Rough' | 'Deep Rough' | 'Sand' | 'Tee Box';

export type ShotType = 'Normal' | 'Punch' | 'Pitch' | 'Chip' | 'Flop' | 'Fade' | 'Draw' | 'Knockdown';

export interface CustomRule {
  id: string;
  name: string;
  active: boolean;
  conditionField: 'windSpeed' | 'elevation' | 'targetDistance' | 'lieType';
  conditionOperator: '>' | '<' | '===';
  conditionValue: string | number;
  actionType: 'addYards' | 'subtractYards' | 'multiplyPower';
  actionValue: number; // value to add/sub or multiplier percentage (e.g. 105 for +5% power)
}

export interface UserProfile {
  id: string;
  name: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Pro';
  preferredUnits: 'Imperial' | 'Metric'; // Yards & Feet vs Meters
  windUnits: 'mph' | 'm/s' | 'km/h';
  elevationUnits: 'ft' | 'm';
  favoriteShotTypes: ShotType[];
  personalAdjustment: number; // percentage (e.g. 100 for default)
  customRules: CustomRule[];
  windHeadwindCoef?: number;
  windTailwindCoef?: number;
  windHeadwindCoefShort?: number;
  windTailwindCoefShort?: number;
  elevationUphillRatio?: number;
  elevationDownhillRatio?: number;
}

export interface ShotCalculation {
  id: string;
  timestamp: number;
  targetDistance: number;
  elevation: number;
  windSpeed: number;
  windAngle: number; // 0 - 360
  lieType: LieType;
  shotType: ShotType;
  temperature: number;
  altitude: number;
  humidity: number;
  
  // Calculated outputs
  effectiveDistance: number;
  adjustedCarry: number;
  recommendedClub: string;
  recommendedPower: number; // percentage
  lateralDrift: number; // yards left or right
  isFavorite: boolean;
  playsLikeDistance: number;
  slopeAdjustment: number;
  windDistanceAdjustment: number;
  liePenaltyFactor: number;
  uphillLieSeverity?: 'None' | 'Green' | 'Yellow' | 'Red';
}
