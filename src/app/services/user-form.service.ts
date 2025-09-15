import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserFormService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // User Form Operations
  createUser(userData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/userform`, userData);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/userform`);
  }

  getUserById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/userform/${id}`);
  }
}