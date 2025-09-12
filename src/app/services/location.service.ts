import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private http: HttpClient) {}
  countries() { return this.http.get<any[]>(`${environment.apiUrl}/location/countries`); }
states(countryId: number) { return this.http.get<any[]>(`${environment.apiUrl}/location/states?country_id=${countryId}`); }
cities(stateId: number) {
  return this.http.get<any[]>(`${environment.apiUrl}/location/cities?/state_id=${stateId}`);
}

}