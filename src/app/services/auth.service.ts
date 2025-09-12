import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Log {
  calendar_id?: number;
  org_id: number;
  login_time: string;
  logout_time?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/auth`;
  private calendarLogBase = `${environment.apiUrl}/calendar-log`;

  constructor(private http: HttpClient) {}

  // ----------------- Auth APIs -----------------
  login(credentials: { org_name: string; email: string; password: string }) {
    return this.http.post<any>(`${this.base}/login`, credentials);
  }

  register(data: { org_name: string; email: string; password: string }) {
    return this.http.post<any>(`${this.base}/register`, data);
  }

  // ----------------- Calendar Log APIs -----------------
logLogin(org_id: number) {
  const data = { org_id };
  return this.http.post<{ calendar_id: number }>(
    `${this.calendarLogBase}/store`,
    data
  );
}


  logLogout(calendar_id: number) {
    return this.http.put<any>(
      `${this.calendarLogBase}/logout/${calendar_id}`,
      {}
    );
  }

  getLatestLog(org_id: number) {
    return this.http.get<any>(`${this.calendarLogBase}/latest/${org_id}`);
  }

  // ----------------- Local Storage -----------------
  setAuth(data: any) {
    localStorage.setItem('auth', JSON.stringify(data));
  }

  getAuth(): any | null {
    const raw = localStorage.getItem('auth');
    return raw ? JSON.parse(raw) : null;
  }

  getOrgId(): number | null {
    const auth = this.getAuth();
    return auth ? auth.id : null;
  }

  logout() {
    localStorage.removeItem('auth');
    localStorage.removeItem('calendar_id');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth');
  }

  clearAuth() {
    this.logout();
  }

  get session() {
    return this.getAuth();
  }
}
