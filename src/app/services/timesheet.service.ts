import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Log {
  calendar_id?: number;
  org_id: number;
  login_time: string;
  logout_time?: string;
  org_name?: string;
}

export interface Task {
  id?: number;
  org_id: number;
  task_name: string;
  assign_date: string;
  end_date: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private baseUrl = 'http://localhost/ci4_api'; 

  constructor(private http: HttpClient) {}

  // Calendar Log methods
  addLogin(orgId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/calendar-log`, { org_id: orgId });
  }

  updateLogout(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/calendar-log/logout/${id}`, {});
  }

getOrgLogins(orgId: number): Observable<Log[]> {
  return this.http.get<Log[]>(`${this.baseUrl}/timesheet/orgLogins/${orgId}`);
}


  // Task methods
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`);
  }

  addTask(task: Task): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks`, task);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/tasks/${id}`, { status });
  }
}