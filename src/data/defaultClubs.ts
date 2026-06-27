import { Club } from '../types';

export const defaultClubs: Club[] = [
  { id: '1', name: 'Driver', loft: 9.5, carry: 260, total: 285, spin: 2400, tendency: 'Slight Fade', confidence: 4 },
  { id: '2', name: '3-Wood', loft: 15, carry: 235, total: 250, spin: 3200, tendency: 'Straight', confidence: 3 },
  { id: '3', name: '5-Wood', loft: 18, carry: 215, total: 225, spin: 3800, tendency: 'Straight', confidence: 4 },
  { id: '4', name: '3-Iron', loft: 21, carry: 195, total: 205, spin: 4500, tendency: 'Slight Draw', confidence: 3 },
  { id: '5', name: '4-Iron', loft: 24, carry: 185, total: 193, spin: 5000, tendency: 'Straight', confidence: 4 },
  { id: '6', name: '5-Iron', loft: 27, carry: 175, total: 181, spin: 5500, tendency: 'Straight', confidence: 4 },
  { id: '7', name: '6-Iron', loft: 30, carry: 165, total: 170, spin: 6000, tendency: 'Straight', confidence: 5 },
  { id: '8', name: '7-Iron', loft: 34, carry: 155, total: 159, spin: 6500, tendency: 'Straight', confidence: 5 },
  { id: '9', name: '8-Iron', loft: 38, carry: 145, total: 148, spin: 7000, tendency: 'Straight', confidence: 5 },
  { id: '10', name: '9-Iron', loft: 42, carry: 135, total: 137, spin: 7500, tendency: 'Straight', confidence: 5 },
  { id: '11', name: 'PW', loft: 46, carry: 120, total: 122, spin: 8500, tendency: 'Straight', confidence: 5 },
  { id: '12', name: 'GW', loft: 50, carry: 105, total: 106, spin: 9200, tendency: 'Straight', confidence: 4 },
  { id: '13', name: 'SW', loft: 54, carry: 90, total: 91, spin: 10000, tendency: 'Straight', confidence: 4 },
  { id: '14', name: 'LW', loft: 58, carry: 75, total: 75, spin: 10500, tendency: 'Slight Fade', confidence: 3 },
];

export const defaultRules = [
  { id: 'r1', name: 'Heavy Wind Action', active: true, conditionField: 'windSpeed', conditionOperator: '>', conditionValue: 12, actionType: 'addYards', actionValue: 4 },
  { id: 'r2', name: 'Extreme Uphill Adjustment', active: true, conditionField: 'elevation', conditionOperator: '>', conditionValue: 30, actionType: 'addYards', actionValue: 5 },
  { id: 'r3', name: 'Rough Lie Precaution', active: true, conditionField: 'lieType', conditionOperator: '===', conditionValue: 'Heavy Rough', actionType: 'subtractYards', actionValue: 8 }
];
