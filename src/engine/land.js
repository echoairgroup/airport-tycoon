import { addMoney } from './economy.js';

export const LAND_PARCEL_SIZE = 80;

export function getNextLandParcelCost(state) {
  const owned = Array.isArray(state.landParcels) ? state.landParcels.length : 0;
  return Math.round(22000 * Math.pow(1.34, owned));
}

export function getNextLandParcel(state, side) {
  if (!['east', 'west', 'north'].includes(side)) return null;
  const parcels = Array.isArray(state.landParcels) ? state.landParcels : [];
  const tier = parcels.filter(parcel => parcel.side === side).length + 1;
  if (side === 'east') {
    return { id: 'land-east-' + tier, side, tier, x: 130 + (tier - 1) * LAND_PARCEL_SIZE, z: 69.75, w: 80, d: 78 };
  }
  if (side === 'west') {
    return { id: 'land-west-' + tier, side, tier, x: -130 - (tier - 1) * LAND_PARCEL_SIZE, z: 69.75, w: 80, d: 78 };
  }
  return { id: 'land-north-' + tier, side, tier, x: 0, z: 158 + (tier - 1) * LAND_PARCEL_SIZE, w: 180, d: 80 };
}

export function purchaseLandParcel(state, side) {
  const parcel = getNextLandParcel(state, side);
  if (!parcel) return { ok: false, reason: 'invalid-side' };
  const cost = getNextLandParcelCost(state);
  if (state.money < cost) return { ok: false, reason: 'funds', cost };
  addMoney(state, -cost);
  state.landParcels = [...(state.landParcels || []), { ...parcel, purchasedAt: state.gameMinutes }];
  return { ok: true, parcel, cost };
}
