import { Injectable } from '@angular/core';
import { MareeRow } from '../components/graphique/graphique-types.util';

export interface GraphiqueState {
  data: MareeRow[];
  spliteddata: MareeRow[][];
  sensorNames: { [key: string]: string };
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  distance: number;
  distanceKm: number;
  directDistance: number;
  directDistanceKm: number;
  sensorCount: number;
  activeSensors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GraphiqueDataService {
  private state: GraphiqueState | null = null;

  constructor() {}

  hasData(): boolean {
    return this.state !== null;
  }

  getState(): GraphiqueState | null {
    return this.state;
  }

  setState(state: GraphiqueState): void {
    this.state = state;
  }

  clearData(): void {
    this.state = null;
  }
}