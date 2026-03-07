import type { BloodType } from '../types.js';

// Recipient blood type -> compatible donor types
const COMPATIBILITY: Record<BloodType, BloodType[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export function isCompatible(donorType: BloodType, recipientNeeds: BloodType): boolean {
  return COMPATIBILITY[recipientNeeds].includes(donorType);
}

export function getCompatibleDonorTypes(recipientNeeds: BloodType): BloodType[] {
  return COMPATIBILITY[recipientNeeds];
}
