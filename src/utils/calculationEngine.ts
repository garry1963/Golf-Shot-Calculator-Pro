import { Club, CustomRule, LieType, ShotCalculation, ShotType, UserProfile } from '../types';

/**
 * Calculates environmental and tactical adjustments for a golf shot.
 */
export function calculateAdjustments(params: {
  targetDistance: number;
  elevation: number; // in feet (uphill +, downhill -)
  windSpeed: number; // mph
  windAngle: number; // 0 - 360 degrees
  lieType: LieType;
  shotType: ShotType;
  temperature?: number; // Fahrenheit, default 70
  altitude?: number; // feet, default 0
  humidity?: number; // percentage, default 50
  profile: UserProfile;
  clubs: Club[];
  uphillLieSeverity?: 'None' | 'Green' | 'Yellow' | 'Red';
  shotCategory?: 'Auto' | 'Full/Tee' | 'Approach';
  allowRollout?: boolean;
}): ShotCalculation {
  const {
    targetDistance,
    elevation,
    windSpeed,
    windAngle,
    lieType,
    shotType,
    temperature = 70,
    altitude = 0,
    humidity = 50,
    profile,
    clubs,
    uphillLieSeverity = 'None',
    shotCategory = 'Auto',
    allowRollout = profile?.allowRollout ?? true
  } = params;

  // 1. Elevation Adjustment
  // Rule of thumb: Uphill plays +1 yd for every 3 ft. Downhill plays -1 yd for every 4.5 ft.
  let elevationAdjustment = 0;
  const uphillRatio = profile?.elevationUphillRatio ?? 3.0;
  const downhillRatio = profile?.elevationDownhillRatio ?? 4.5;
  if (elevation > 0) {
    elevationAdjustment = elevation / uphillRatio;
  } else if (elevation < 0) {
    elevationAdjustment = elevation / downhillRatio; // Will be negative
  }

  // 2. Wind Vector breakdown
  // Wind angle 0 is direct headwind. 180 is direct tailwind.
  // 90 is crosswind from the right. 270 is crosswind from the left.

  // Uphill Lies:
  // Add 1 mph to the calculations for green slopes.
  // Add 2 mph for yellow slopes.
  // Add 5 mph for red slopes.
  let baseWindSpeed = windSpeed;
  if (uphillLieSeverity === 'Green') {
    baseWindSpeed += 1;
  } else if (uphillLieSeverity === 'Yellow') {
    baseWindSpeed += 2;
  } else if (uphillLieSeverity === 'Red') {
    baseWindSpeed += 5;
  }

  // Diagonal/Quartering Winds:
  // If the wind arrow is at a 45-degree angle. Multiply the wind speed by 0.75.
  let effectiveWindSpeed = baseWindSpeed;
  if (windAngle % 90 === 45) {
    effectiveWindSpeed *= 0.75;
  }

  const angleRad = (windAngle * Math.PI) / 180;
  const cosAngle = Math.cos(angleRad); // positive is headwind, negative is tailwind
  const sinAngle = Math.sin(angleRad); // positive is right-to-left, negative is left-to-right

  const headwindComponent = effectiveWindSpeed * cosAngle;
  const crosswindComponent = effectiveWindSpeed * sinAngle;

  // Headwind increases effective distance (plays longer). Tailwind decreases it (plays shorter).
  // - Full Shots / Tee Shots: Lower trajectory and penetrating flight (standard 1.15 y/mph)
  // - Approach Shots: Higher backspin and steeper climb causes ball to balloon in headwind (standard 1.25 y/mph)
  // - Short Shots (50 to 100 yards): Dedicated short-range multiplier (standard 0.70 y/mph)
  const isShortShot = targetDistance >= 50 && targetDistance <= 100;
  const isTeeShot = lieType === 'Tee Box';
  const isFullOrTee = isTeeShot || targetDistance >= 200;

  const fullTeeHeadwindCoef = profile?.windHeadwindFullTeeCoef ?? profile?.windHeadwindCoef ?? 1.15;
  const approachHeadwindCoef = profile?.windHeadwindApproachCoef ?? 1.25;

  let resolvedCategory: 'Full/Tee' | 'Approach' | 'Short';
  if (shotCategory === 'Full/Tee') {
    resolvedCategory = 'Full/Tee';
  } else if (shotCategory === 'Approach') {
    resolvedCategory = 'Approach';
  } else if (isShortShot && profile?.windHeadwindCoefShort !== undefined && profile?.windHeadwindCoefShort !== null) {
    resolvedCategory = 'Short';
  } else if (isFullOrTee) {
    resolvedCategory = 'Full/Tee';
  } else {
    resolvedCategory = 'Approach';
  }

  let headwindCoef = fullTeeHeadwindCoef;
  if (resolvedCategory === 'Short') {
    headwindCoef = profile?.windHeadwindCoefShort ?? 0.70;
  } else if (resolvedCategory === 'Approach') {
    headwindCoef = approachHeadwindCoef;
  } else {
    headwindCoef = fullTeeHeadwindCoef;
  }

  const tailwindCoef = isShortShot
    ? (profile?.windTailwindCoefShort ?? 0.50)
    : (profile?.windTailwindCoef ?? 0.80);
  let windDistanceAdjustment = 0;
  if (headwindComponent > 0) {
    // Headwind
    windDistanceAdjustment = headwindComponent * headwindCoef;
  } else {
    // Tailwind (headwindComponent is negative)
    windDistanceAdjustment = headwindComponent * tailwindCoef;
  }

  // Knockdown shots reduce wind influence by 40%
  if (shotType === 'Knockdown') {
    windDistanceAdjustment *= 0.6;
  }

  // 3. Advanced Air Density Adjustment (Temperature & Altitude)
  // Baseline is 70°F and 0ft (sea level)
  // For every 10°F above 70, ball goes 1% further. Below 70, it goes 1% shorter.
  const tempDiff = temperature - 70;
  const tempMultiplier = 1 + (tempDiff / 10) * 0.01;

  // For every 1000 ft of altitude, ball carries 1.5% further.
  const altitudeMultiplier = 1 + (altitude / 1000) * 0.015;

  // Humidity has a very minor positive effect on air density (thinner air)
  const humidityAdj = ((humidity - 50) / 100) * 0.5; // up to +/- 0.25 yards

  // Combine environmental effects to find Effective Distance before lie and shot modifiers
  let effectiveDistance = targetDistance + elevationAdjustment + windDistanceAdjustment;
  
  // Apply atmospheric multipliers
  // We divide target yards by air density multipliers to find how long it "feels"
  // E.g. in thin hot air, 150 yards plays shorter (e.g. 145 effective)
  const atmosphericMultiplier = tempMultiplier * altitudeMultiplier;
  effectiveDistance = effectiveDistance / atmosphericMultiplier - humidityAdj;

  // 4. Lie Modifiers (Affects carry distance, spin, and roll)
  let lieMultiplier = 1.0;
  switch (lieType) {
    case 'Fairway':
    case 'Tee Box':
      lieMultiplier = 1.0;
      break;
    case 'First Cut':
      lieMultiplier = 0.96;
      break;
    case 'Heavy Rough':
      lieMultiplier = 0.90;
      break;
    case 'Deep Rough':
      lieMultiplier = 0.82;
      break;
    case 'Sand':
      lieMultiplier = 0.85;
      break;
    default:
      lieMultiplier = 1.0;
  }

  // 5. Shot Type Modifiers
  let shotMultiplier = 1.0;
  switch (shotType) {
    case 'Normal':
      shotMultiplier = 1.0;
      break;
    case 'Punch':
      shotMultiplier = 0.90; // punch carries less, rolls more
      break;
    case 'Pitch':
      shotMultiplier = 0.75;
      break;
    case 'Chip':
      shotMultiplier = 0.45;
      break;
    case 'Flop':
      shotMultiplier = 0.65;
      break;
    case 'Fade':
      shotMultiplier = 0.97;
      break;
    case 'Draw':
      shotMultiplier = 1.03;
      break;
    case 'Knockdown':
      shotMultiplier = 0.92;
      break;
    default:
      shotMultiplier = 1.0;
  }

  // 6. Rollout Modifiers based on lie and shot type
  let rolloutLieMultiplier = 1.0;
  switch (lieType) {
    case 'Fairway':
    case 'Tee Box':
      rolloutLieMultiplier = 1.0;
      break;
    case 'First Cut':
      rolloutLieMultiplier = 0.85;
      break;
    case 'Heavy Rough':
      rolloutLieMultiplier = 0.65;
      break;
    case 'Deep Rough':
      rolloutLieMultiplier = 0.40;
      break;
    case 'Sand':
      rolloutLieMultiplier = 0.35;
      break;
    default:
      rolloutLieMultiplier = 1.0;
  }

  let rolloutShotMultiplier = 1.0;
  switch (shotType) {
    case 'Normal':
      rolloutShotMultiplier = 1.0;
      break;
    case 'Punch':
      rolloutShotMultiplier = 1.5; // punch carries less, rolls more
      break;
    case 'Pitch':
      rolloutShotMultiplier = 0.8;
      break;
    case 'Chip':
      rolloutShotMultiplier = 1.4; // chips roll out
      break;
    case 'Flop':
      rolloutShotMultiplier = 0.2; // flop stops dead
      break;
    case 'Fade':
      rolloutShotMultiplier = 0.8; // fades land soft
      break;
    case 'Draw':
      rolloutShotMultiplier = 1.2; // draws roll further
      break;
    case 'Knockdown':
      rolloutShotMultiplier = 1.25;
      break;
    default:
      rolloutShotMultiplier = 1.0;
  }

  // 7. User Profile Adjustment (Personal strength adjustment)
  const personalFactor = (profile.personalAdjustment || 100) / 100;
  const userRolloutMultiplier = profile?.rolloutMultiplier ?? 1.0;

  // 8. Find recommended Club and Power (factoring in club ball rollout)
  let recommendedClub = 'None';
  let recommendedPower = 100;
  let bestClub: Club | null = null;
  let expectedRollout = 0;

  if (clubs.length > 0) {
    // Sort clubs by carry distance descending
    const sortedClubs = [...clubs].sort((a, b) => b.carry - a.carry);
    bestClub = sortedClubs[sortedClubs.length - 1]; // Default to shortest club

    for (let i = sortedClubs.length - 1; i >= 0; i--) {
      const club = sortedClubs[i];
      const nominalRoll = Math.max(0, club.total - club.carry);
      const effectiveClubRoll = allowRollout
        ? nominalRoll * rolloutLieMultiplier * rolloutShotMultiplier * userRolloutMultiplier
        : 0;
      const effectiveFullTotal = (club.carry * lieMultiplier * shotMultiplier * personalFactor) + effectiveClubRoll;

      if (effectiveFullTotal >= effectiveDistance) {
        bestClub = club;
        break;
      }
      if (i === 0) {
        bestClub = sortedClubs[0];
      }
    }

    recommendedClub = bestClub.name;
    const nominalRoll = Math.max(0, bestClub.total - bestClub.carry);
    expectedRollout = allowRollout
      ? Math.round(nominalRoll * rolloutLieMultiplier * rolloutShotMultiplier * userRolloutMultiplier * 10) / 10
      : 0;
  }

  // 9. Calculate Adjusted Carry required
  // When allowing for rollout, the required carry is reduced by expected rollout so the ball rolls to the target pin!
  const requiredCarryDistance = Math.max(0, effectiveDistance - expectedRollout);
  let adjustedCarry = requiredCarryDistance / (lieMultiplier * shotMultiplier * personalFactor);

  // 10. Custom Rules Evaluation
  if (profile.customRules && profile.customRules.length > 0) {
    profile.customRules.forEach((rule: CustomRule) => {
      if (!rule.active) return;

      let isTriggered = false;
      const { conditionField, conditionOperator, conditionValue, actionType, actionValue } = rule;

      // Evaluate condition field
      let actualValue: string | number = 0;
      if (conditionField === 'windSpeed') actualValue = windSpeed;
      else if (conditionField === 'elevation') actualValue = Math.abs(elevation);
      else if (conditionField === 'targetDistance') actualValue = targetDistance;
      else if (conditionField === 'lieType') actualValue = lieType;

      // Operator checks
      if (conditionOperator === '>') {
        isTriggered = Number(actualValue) > Number(conditionValue);
      } else if (conditionOperator === '<') {
        isTriggered = Number(actualValue) < Number(conditionValue);
      } else if (conditionOperator === '===') {
        isTriggered = String(actualValue).toLowerCase() === String(conditionValue).toLowerCase();
      }

      if (isTriggered) {
        if (actionType === 'addYards') {
          adjustedCarry += actionValue;
        } else if (actionType === 'subtractYards') {
          adjustedCarry -= actionValue;
        } else if (actionType === 'multiplyPower') {
          adjustedCarry *= (actionValue / 100);
        }
      }
    });
  }

  // Calculate power percentage for the selected club
  if (bestClub) {
    let powerPct = Math.round((adjustedCarry / bestClub.carry) * 100);
    recommendedPower = Math.max(40, Math.min(105, powerPct));
  }

  const projectedTotal = Math.round(((adjustedCarry * lieMultiplier * shotMultiplier * personalFactor) + expectedRollout) * 10) / 10;

  // 9. Lateral Wind Drift & Tendency Adjustments
  // Use the baseline crosswind multipliers:
  // Short Wedges (<100 Yards): Multiply wind mph by 0.5 
  // Mid Irons (100–175 Yards): Multiply wind mph by 1.0 
  // Long Irons & Hybrids (175–225 Yards): Multiply wind mph by 1.25.
  // Woods & Drivers (>225 Yards): Multiply wind mph by 1.5.
  let crosswindMultiplier = 1.0;
  if (targetDistance < 100) {
    crosswindMultiplier = 0.5;
  } else if (targetDistance >= 100 && targetDistance <= 175) {
    crosswindMultiplier = 1.0;
  } else if (targetDistance > 175 && targetDistance <= 225) {
    crosswindMultiplier = 1.25;
  } else {
    crosswindMultiplier = 1.5;
  }

  let lateralDrift = crosswindComponent * crosswindMultiplier;

  // Apply shot type drift modifiers
  if (shotType === 'Fade') {
    lateralDrift += 4; // Fade naturally drifts right (+ yards)
  } else if (shotType === 'Draw') {
    lateralDrift -= 4; // Draw naturally drifts left (- yards)
  } else if (shotType === 'Knockdown') {
    lateralDrift *= 0.65; // Knockdown shot penetrates wind better
  }

  // Round results
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    targetDistance,
    elevation,
    windSpeed,
    windAngle,
    lieType,
    shotType,
    temperature,
    altitude,
    humidity,
    effectiveDistance: Math.round(effectiveDistance * 10) / 10,
    adjustedCarry: Math.round(adjustedCarry * 10) / 10,
    expectedRollout: Math.round(expectedRollout * 10) / 10,
    projectedTotal: Math.round(projectedTotal * 10) / 10,
    allowRollout,
    recommendedClub,
    recommendedPower,
    lateralDrift: Math.round(lateralDrift * 10) / 10,
    isFavorite: false,
    playsLikeDistance: Math.round(effectiveDistance * 10) / 10,
    slopeAdjustment: Math.round(elevationAdjustment * 10) / 10,
    windDistanceAdjustment: Math.round(windDistanceAdjustment * 10) / 10,
    liePenaltyFactor: Math.round((1 / lieMultiplier) * 100) / 100,
    uphillLieSeverity,
    shotCategory: resolvedCategory,
    appliedHeadwindCoef: Math.round(headwindCoef * 100) / 100
  };
}
