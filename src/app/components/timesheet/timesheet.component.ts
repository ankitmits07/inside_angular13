import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TimesheetService, Log, Task } from '../../services/timesheet.service';

interface MonthDay {
  date: Date;
  log?: Log | null;
}

@Component({
  selector: 'app-timesheet',
  templateUrl: './timesheet.component.html',
  styleUrls: ['./timesheet.component.css'],
})
export class TimesheetComponent implements OnInit {
  view: 'calendar' | 'todo' | 'graph' = 'calendar';
  monthDays: MonthDay[] = [];
  hoveredLog: Log | null = null;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  minYear = this.currentYear - 1;
  maxYear = this.currentYear + 1;
  hasLoginRecords: boolean | null = null;
  

  months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  orgId = 4;
  form: FormGroup;

  // Add statusTypes property
  statusTypes: string[] = ['pending', 'complete', 'overdue'];

  constructor(
    private fb: FormBuilder, 
    private timesheet: TimesheetService,
    private cdRef: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      task_name: ['', Validators.required],
      assign_date: ['', Validators.required],
      end_date: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.generateMonth();
    this.loadTasks();
     this.checkLoginRecords();
       this.debugDateComparisons();
  }

  /** ---------------- Calendar ---------------- */
  generateMonth() {
    this.monthDays = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) this.monthDays.push({ date: new Date(NaN), log: null });
    for (let d = 1; d <= daysInMonth; d++) {
      this.monthDays.push({ date: new Date(this.currentYear, this.currentMonth, d), log: null });
    }
  }

  prevMonth() { 
    if (this.currentMonth === 0 && this.currentYear > this.minYear) { this.currentYear--; this.currentMonth = 11; } 
    else if (this.currentMonth > 0) this.currentMonth--; 
    this.generateMonth(); 
  }

  nextMonth() { 
    if (this.currentMonth === 11 && this.currentYear < this.maxYear) { this.currentYear++; this.currentMonth = 0; } 
    else if (this.currentMonth < 11) this.currentMonth++; 
    this.generateMonth(); 
  }

  prevYear() { if (this.currentYear > this.minYear) { this.currentYear--; this.generateMonth(); } }
  nextYear() { if (this.currentYear < this.maxYear) { this.currentYear++; this.generateMonth(); } }

  isToday(date: Date) { 
    if (!this.isValidDate(date)) return false; 
    const today = new Date(); 
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(); 
  }

  isValidDate(date: Date) { return !isNaN(date.getTime()); }

canHover(date: Date): boolean {
  if (!this.isValidDate(date)) return false;
  
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  return compareDate <= todayLocal;
}

  /** ---------------- Hover ---------------- */
// In your TimesheetComponent

hoverDate(day: MonthDay | null) {
  if (!day || !this.isValidDate(day.date)) {
    this.hoveredLog = null;
    return;
  }

  const hoverDate = day.date;
  const hoverDateStr = this.formatDateToYMD(hoverDate);
  console.log('Hovering on date:', hoverDateStr);
  console.log('Using orgId:', this.orgId);

  if (!this.canHover(hoverDate)) {
    console.log('Cannot hover on this date (future date)');
    this.hoveredLog = null;
    return;
  }

  this.timesheet.getOrgLogins(this.orgId).subscribe(
    (response: any) => {
      console.log('API response:', response);
      
      // Handle both object and array responses
      let logs = [];
      
      if (Array.isArray(response)) {
        // If it's an array, use it directly
        logs = response;
        console.log('Response is an array, length:', logs.length);
      } else if (response && typeof response === 'object') {
        // If it's an object, wrap it in an array
        logs = [response];
        console.log('Response is an object, wrapping in array');
      } else {
        // If it's null, undefined, or other unexpected type
        console.log('Unexpected response type:', typeof response);
        logs = [];
      }

      console.log('Processed logs:', logs);

      if (logs.length === 0) {
        console.log('No login records found');
        this.hoveredLog = null;
        return;
      }

      // Find logs that match the hovered date
      const matchingLogs = logs.filter(log => {
        if (log && log.login_time) {
          const logDate = new Date(log.login_time);
          const logDateStr = this.formatDateToYMD(logDate);
          const isMatch = logDateStr === hoverDateStr;
          console.log('Comparing:', logDateStr, '===', hoverDateStr, '=', isMatch);
          return isMatch;
        }
        return false;
      });

      console.log('Matching logs found:', matchingLogs.length);

      if (matchingLogs.length > 0) {
        // Get the most recent log
        this.hoveredLog = matchingLogs.reduce((latest, current) => {
          return new Date(current.login_time) > new Date(latest.login_time) ? current : latest;
        }, matchingLogs[0]);
        
        console.log('✅ Hover log selected:', this.hoveredLog);
      } else {
        console.log('❌ No logs found for the hovered date');
        this.hoveredLog = null;
      }
    },
    error => {
      console.error('Error fetching login records:', error);
      this.hoveredLog = null;
    }
  );
}
// Helper method to format date as YYYY-MM-DD (ignores timezone)
formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
  /** ---------------- Tasks ---------------- */

  loadTasks() {
    this.timesheet.getTasks().subscribe({
      next: (res: Task[]) => {
        console.log('Tasks loaded from API:', res);
        // Filter tasks for this organization
        this.tasks = res.filter(t => t.org_id == this.orgId);
        this.filteredTasks = [...this.tasks];
        console.log('Filtered tasks for org', this.orgId, ':', this.tasks);
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.tasks = [];
        this.filteredTasks = [];
        this.cdRef.detectChanges();
      }
    });
  }

  saveTask() {
    if (this.form.invalid) {
      console.log('Form is invalid');
      return;
    }

    const formValue = this.form.value;

    const payload = {
      org_id: this.orgId,
      task_name: formValue.task_name,
      assign_date: formValue.assign_date,
      end_date: formValue.end_date,
      status: 'pending'
    };

    console.log('Sending new task payload:', payload);

    this.timesheet.addTask(payload).subscribe({
      next: (res: any) => {
        console.log('Task added successfully:', res);
        
        this.form.reset();
        
        // Add the new task to local arrays immediately
        const newTask: Task = {
          id: res.id,
          org_id: this.orgId,
          task_name: payload.task_name,
          assign_date: payload.assign_date,
          end_date: payload.end_date,
          status: 'pending'
        };
        
        this.tasks.push(newTask);
        this.filteredTasks.push(newTask);
        
        console.log('Added new task to local arrays:', newTask);
        
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error adding task:', err);
        alert('Error adding task: ' + (err.error?.message || err.message));
      }
    });
  }

  updateStatus(id: number, status: Task['status']) {
    console.log('Updating task', id, 'to status:', status);
    this.timesheet.updateStatus(id, status).subscribe({
      next: () => {
        console.log('Status updated successfully');
        
        // Update the local tasks immediately
        const taskIndex = this.tasks.findIndex(t => t.id == id);
        if (taskIndex !== -1) {
          this.tasks[taskIndex].status = status;
        }
        
        const filteredTaskIndex = this.filteredTasks.findIndex(t => t.id == id);
        if (filteredTaskIndex !== -1) {
          this.filteredTasks[filteredTaskIndex].status = status;
        }
        
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        alert('Error updating status: ' + (err.error?.message || err.message));
      }
    });
  }

  // Filter tasks by status
  filterTasks(status: string) {
    console.log('Filtering tasks by status:', status);
    if (status === 'all') {
      this.filteredTasks = [...this.tasks];
    } else {
      this.filteredTasks = this.tasks.filter(t => t.status === status);
    }
    console.log('Filtered tasks:', this.filteredTasks);
    this.cdRef.detectChanges();
  }

  resetFilter() {
    this.filteredTasks = [...this.tasks];
    this.cdRef.detectChanges();
  }

  // Get task count by status
  getTaskCount(status: string): number {
    if (!this.tasks.length) return 0;
    return this.tasks.filter(t => t.status === status).length;
  }

  // Get percentage for each status
  getPercentage(status: string): number {
    if (!this.tasks.length) return 0;
    const count = this.getTaskCount(status);
    return Math.round((count / this.tasks.length) * 100);
  }

  // Getter properties for percentages (for the graph)
  get percentPending(): number { 
    return this.getPercentage('pending');
  }
  
  get percentComplete(): number { 
    return this.getPercentage('complete');
  }
  
  get percentOverdue(): number { 
    return this.getPercentage('overdue');
  }

  // Getter properties for counts (for the status cards)
  get pendingCount(): number {
    return this.getTaskCount('pending');
  }

  get completeCount(): number {
    return this.getTaskCount('complete');
  }

  get overdueCount(): number {
    return this.getTaskCount('overdue');
  }

  // Refresh view
  refreshView() {
    console.log('Refreshing view...');
    this.loadTasks();
  }

  // TrackBy function for better performance
  trackByTaskId(index: number, task: Task): number {
    return task.id || index;
  }
  debugApiCall() {
  this.timesheet.getOrgLogins(this.orgId).subscribe(
    (response: any) => {
      console.log('DEBUG - API Response:', response);
      console.log('Type:', typeof response);
      console.log('Is Array:', Array.isArray(response));
      console.log('Keys:', Object.keys(response));
    },
    error => {
      console.error('DEBUG - API Error:', error);
    }
  );
}
// In timesheet.component.ts
checkLoginRecords() {
  console.log('Checking login records for org_id:', this.orgId);
  
  this.timesheet.getOrgLogins(this.orgId).subscribe({
    next: (response: any) => {
      console.log('Login records response:', response);
      console.log('Number of records:', Array.isArray(response) ? response.length : 'Not an array');
      
      if (Array.isArray(response) && response.length > 0) {
        console.log('Latest login record:', response[0]);
      }
    },
    error: (error) => {
      console.error('Error checking login records:', error);
    }
  });
}

// Add this method to debug date comparisons
debugDateComparisons() {
  console.log('=== DEBUG DATE COMPARISONS ===');
  
  // Test with the actual response from your API
  const testLog = {
    "calendar_id": "6",
    "org_id": "4",
    "login_time": "2025-09-13 06:38:00",
    "logout_time": "2025-09-13 06:38:00"
  };
  
  console.log('Test log:', testLog);
  
  const utcDate = new Date(testLog.login_time);
  console.log('UTC date from DB:', utcDate.toUTCString());
  console.log('Local date:', utcDate.toString());
  console.log('Formatted YMD:', this.formatDateToYMD(utcDate));
  
  // Simulate hover on Sept 13
  const sept13 = new Date(2025, 8, 13); // Month is 0-based (8 = September)
  console.log('Hover date (Sept 13):', this.formatDateToYMD(sept13));
  
  const isMatch = this.formatDateToYMD(utcDate) === this.formatDateToYMD(sept13);
  console.log('Dates match:', isMatch);
  
  if (isMatch) {
    console.log('✅ Hover should work for September 13th!');
  } else {
    console.log('❌ Hover will not work - dates dont match');
  }
}
// Call this in ngOnInit to test
checkAllLogins() {
  console.log('=== CHECKING ALL LOGIN RECORDS ===');
  console.log('Requesting logs for orgId:', this.orgId);
  
  this.timesheet.getOrgLogins(this.orgId).subscribe({
    next: (response: any) => {
      console.log('API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Is array:', Array.isArray(response));
      
      // Handle both object and array responses
      if (Array.isArray(response)) {
        console.log('Array length:', response.length);
        if (response.length === 0) {
          console.log('Empty array returned');
        } else {
          console.log('Records found in array');
        }
      } else if (response && typeof response === 'object') {
        console.log('Single object returned:', response);
        console.log('Calendar ID:', response.calendar_id);
        console.log('Login Time:', response.login_time);
      } else {
        console.log('Unexpected response type');
      }
    },
    error: (error) => {
      console.error('Error checking login records:', error);
    }
  });
}

}