import { Service, computed, signal } from '@angular/core';

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Place {
  readonly id: string;
  readonly name: string;
  readonly area: string;
  readonly coordinates: Coordinates;
}

export interface RideOption {
  readonly id: 'economy' | 'comfort' | 'xl';
  readonly name: string;
  readonly seats: number;
  /** Pounds per kilometre, on top of the base fare. */
  readonly perKm: number;
  readonly base: number;
  /** Minutes until a car of this kind reaches the pickup. */
  readonly eta: number;
}

export interface Driver {
  readonly id: string;
  readonly name: string;
  readonly car: string;
  readonly plate: string;
  readonly coordinates: Coordinates;
}

export type TripStage = 'idle' | 'choosing' | 'finding' | 'arriving';

/** Where the rider is standing: King's Cross. */
export const PICKUP: Coordinates = { latitude: 51.5308, longitude: -0.1238 };

export const PLACES: readonly Place[] = [
  ['British Museum', 'Bloomsbury', 51.5194, -0.127],
  ['Tate Modern', 'Bankside', 51.5076, -0.0994],
  ['Borough Market', 'Southwark', 51.5055, -0.091],
  ['Covent Garden', 'West End', 51.5117, -0.124],
  ['Camden Market', 'Camden', 51.5413, -0.1463],
  ['Paddington', 'Westminster', 51.5154, -0.1755],
  ['Victoria', 'Westminster', 51.4965, -0.1447],
  ['Greenwich Park', 'Greenwich', 51.4769, -0.0005],
  ['Canary Wharf', 'Docklands', 51.5054, -0.0235],
  ['Hampstead Heath', 'Hampstead', 51.5608, -0.1629],
  ['Notting Hill', 'Kensington', 51.5094, -0.2046],
  ['Natural History Museum', 'South Kensington', 51.4967, -0.1764],
  ['Shoreditch', 'Hackney', 51.5265, -0.0782],
  ['Brixton', 'Lambeth', 51.4613, -0.1156],
  ['Heathrow Terminal 5', 'Hillingdon', 51.4723, -0.4884],
  ['London Bridge', 'Southwark', 51.5079, -0.0877],
  ['Wembley Stadium', 'Brent', 51.556, -0.2796],
  ['Richmond Park', 'Richmond', 51.4428, -0.2745],
].map(([name, area, latitude, longitude], i) => ({
  id: `p${i + 1}`,
  name: name as string,
  area: area as string,
  coordinates: { latitude: latitude as number, longitude: longitude as number },
}));

export const OPTIONS: readonly RideOption[] = [
  { id: 'economy', name: 'Economy', seats: 4, perKm: 1.2, base: 2.5, eta: 3 },
  { id: 'comfort', name: 'Comfort', seats: 4, perKm: 1.7, base: 3.5, eta: 5 },
  { id: 'xl', name: 'XL', seats: 6, perKm: 2.3, base: 4.5, eta: 8 },
];

/** Straight-line kilometres between two points, which is what the fares are made from. */
export function kilometres(from: Coordinates, to: Coordinates): number {
  const radius = 6371;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

/** The fare for a trip, to the penny. */
export function fare(option: RideOption, km: number): number {
  return Math.round((option.base + option.perKm * km) * 100) / 100;
}

const POUNDS = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function formatFare(amount: number): string {
  return POUNDS.format(amount);
}

/** Places whose name or area contains every word of the query, case aside. */
export function searchPlaces(query: string): readonly Place[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return PLACES;
  return PLACES.filter((place) => {
    const text = `${place.name} ${place.area}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Six drivers around the pickup, each nudged a little every tick, as a live map moves them. */
export function drivers(tick: number): readonly Driver[] {
  return ['Priya', 'Tom', 'Aisha', 'Kofi', 'Mei', 'Luca'].map((name, i) => {
    const angle = (i / 6) * Math.PI * 2 + tick * 0.05;
    const reach = 0.004 + (i % 3) * 0.002;
    return {
      id: `d${i + 1}`,
      name,
      car: ['Toyota Prius', 'Kia Niro', 'Tesla Model 3'][i % 3]!,
      plate: `LN${24 + i} ${'ABCDEF'[i]}XR`,
      coordinates: {
        latitude: PICKUP.latitude + Math.sin(angle) * reach,
        longitude: PICKUP.longitude + Math.cos(angle) * reach * 1.6,
      },
    };
  });
}

/** One trip, shared by the map and the sheet over it. */
@Service()
export class Trip {
  readonly destination = signal<Place | null>(null);
  readonly option = signal<RideOption>(OPTIONS[0]!);
  readonly stage = signal<TripStage>('idle');
  readonly driver = signal<Driver | null>(null);
  private finding: ReturnType<typeof setTimeout> | null = null;

  readonly km = computed(() => {
    const destination = this.destination();
    return destination ? kilometres(PICKUP, destination.coordinates) : 0;
  });

  choose(place: Place): void {
    this.destination.set(place);
    this.stage.set('choosing');
  }

  request(): void {
    this.stage.set('finding');
    this.finding = setTimeout(() => {
      this.finding = null;
      this.driver.set(drivers(0)[OPTIONS.indexOf(this.option())]!);
      this.stage.set('arriving');
    }, 2000);
  }

  cancel(): void {
    if (this.finding) clearTimeout(this.finding);
    this.finding = null;
    this.destination.set(null);
    this.driver.set(null);
    this.stage.set('idle');
  }
}
