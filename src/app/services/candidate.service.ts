// src/app/services/candidate.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private base = `${environment.apiUrl}/candidate`;

  constructor(private http: HttpClient) {}

 
  createOrUpdate(fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.base}/store`, fd);
  }


  getByOrg(orgId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/byOrg/${orgId}`);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/all`);
  }


  update(id: number, fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.base}/update/${id}`, fd);
  }
}