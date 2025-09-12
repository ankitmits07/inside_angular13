import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })


export class ModuleService {
private base = `${environment.apiUrl}/module`;
list(org_id: number) {
  const params = new HttpParams().set('org_id', org_id);
  return this.http.get<any[]>(this.base, { params });
}

constructor(private http: HttpClient) {}
}
