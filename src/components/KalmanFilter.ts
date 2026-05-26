/**
 * RAYOCERO — KALMAN FILTER
 * Filtro de Kalman cinemático 1D aplicado por separado a lat/lng
 * Elimina el ruido del GPS civil (±5-15m) para trazado limpio estilo Strava
 */

export class KalmanFilter {
  private Q: number; // Process noise covariance (confianza en el modelo)
  private R: number; // Measurement noise covariance (confianza en el GPS)
  private P: number; // Estimation error covariance
  private K: number; // Kalman gain
  private x: number; // State estimate
  private initialized: boolean;

  constructor(Q = 0.00001, R = 0.0001) {
    this.Q = Q;
    this.R = R;
    this.P = 1;
    this.K = 0;
    this.x = 0;
    this.initialized = false;
  }

  filter(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return measurement;
    }

    // Predict
    this.P = this.P + this.Q;

    // Update
    this.K = this.P / (this.P + this.R);
    this.x = this.x + this.K * (measurement - this.x);
    this.P = (1 - this.K) * this.P;

    return this.x;
  }

  reset(): void {
    this.P = 1;
    this.K = 0;
    this.x = 0;
    this.initialized = false;
  }
}

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export class GeoKalmanFilter {
  private latFilter: KalmanFilter;
  private lngFilter: KalmanFilter;

  constructor() {
    // Q bajo = suavizado agresivo, R alto = desconfía del GPS
    this.latFilter = new KalmanFilter(0.000001, 0.0001);
    this.lngFilter = new KalmanFilter(0.000001, 0.0001);
  }

  filter(point: GeoPoint): GeoPoint {
    return {
      lat: this.latFilter.filter(point.lat),
      lng: this.lngFilter.filter(point.lng),
      timestamp: point.timestamp,
      accuracy: point.accuracy,
      speed: point.speed,
    };
  }

  reset(): void {
    this.latFilter.reset();
    this.lngFilter.reset();
  }
}