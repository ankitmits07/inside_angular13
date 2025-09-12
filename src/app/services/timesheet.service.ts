import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'; // Import Observable
import { environment } from '../../environments/environment';

export interface Log {
  org_name: string;
  login_time: string;
  logout_time?: string;
}

export interface Task {
  id?: number;
  org_id: number;
  task_name: string;
  assign_date: string;
  end_date: string;
  status: 'pending' | 'complete' | 'overdue';
}

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /** ---------------- Calendar Logs ---------------- */

  // Get latest login for org
  getOrgLogins(orgId: number): Observable<Log> {
    // Only latest is supported by backend
    return this.http.get<Log>(`${this.baseUrl}/calendar-log/latest/${orgId}`);
  }

  /** ---------------- Tasks ---------------- */

  // Get all tasks
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`);
  }

  // Get single task by ID
  getTask(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`);
  }

  // Add new task
  addTask(payload: any): Observable<any> {
    console.log("Payload sent to API:", payload);
    return this.http.post<any>(`${this.baseUrl}/tasks`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Update task completely
  updateTask(id: number, taskData: Partial<Task>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tasks/${id}`, taskData);
  }

  // Update only status of a task
  updateStatus(id: number, status: Task['status']): Observable<any> {
    return this.updateTask(id, { status });
  }

  // Delete task
  deleteTask(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/tasks/${id}`);
  }
}