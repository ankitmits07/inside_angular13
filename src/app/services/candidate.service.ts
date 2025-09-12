// src/app/services/candidate.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private base = `${environment.apiUrl}/candidate`;

  constructor(private http: HttpClient) {}

  /** Create candidate */
  create(fd: FormData) {
    return this.http.post<any>(`${this.base}/store`, fd);
  }

  /** Optional helper: fetch all candidates */
  getAll() {
    return this.http.get<any[]>(`${this.base}/all`);
  }
  getByOrg(orgId: number) {
  return this.http.get<any>(`${this.base}/byOrg/${orgId}`);
}

createOrUpdate(data: FormData) {
  return this.http.post<any>(`${environment.apiUrl}/candidate/store`, data);
}


}
