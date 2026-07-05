import type { Dispatch, SetStateAction } from "react";

export type CatalogueProperty = {
  id: string;
  name: string;
  type: string;
  city: string;
  price: number;
  available: boolean;
};

export type CatalogueReservation = {
  id: string;
  propertyId: string;
  property: string;
  city: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: string;
  type: string;
  guests: number;
  client?: string;
};

export function applySyncToCatalog<P extends CatalogueProperty, R extends CatalogueReservation>(
  propertyUpdates: Array<{ propertyId: string; price?: number; available?: boolean }>,
  newReservations: CatalogueReservation[],
  setProperties: Dispatch<SetStateAction<P[]>>,
  setReservations: Dispatch<SetStateAction<R[]>>,
) {
  if (propertyUpdates.length) {
    setProperties(prev =>
      prev.map(p => {
        const updates = propertyUpdates.filter(u => u.propertyId === p.id);
        if (!updates.length) return p;
        let next = { ...p };
        for (const u of updates) {
          if (u.price !== undefined) next = { ...next, price: u.price };
          if (u.available !== undefined) next = { ...next, available: u.available };
        }
        return next;
      }),
    );
  }
  if (newReservations.length) {
    setReservations(prev => [...(newReservations as R[]), ...prev]);
  }
}
