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
  hoveredLogs: Log[] = [];

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

  statusTypes: string[] = ['pending', 'complete', 'overdue'];
  filteredGraphStatus: 'all' | 'pending' | 'complete' | 'overdue' = 'all';

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
    if (this.currentMonth === 0 && this.currentYear > this.minYear) { 
      this.currentYear--; 
      this.currentMonth = 11; 
    } else if (this.currentMonth > 0) {
      this.currentMonth--; 
    }
    this.generateMonth(); 
  }

  nextMonth() { 
    if (this.currentMonth === 11 && this.currentYear < this.maxYear) { 
      this.currentYear++; 
      this.currentMonth = 0; 
    } else if (this.currentMonth < 11) {
      this.currentMonth++; 
    }
    this.generateMonth(); 
  }

  prevYear() { if (this.currentYear > this.minYear) { this.currentYear--; this.generateMonth(); } }
  nextYear() { if (this.currentYear < this.maxYear) { this.currentYear++; this.generateMonth(); } }

  isToday(date: Date) { 
    if (!this.isValidDate(date)) return false; 
    const today = new Date(); 
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear(); 
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
hoverDate(day: MonthDay | null) {
  if (!day || !this.isValidDate(day.date)) {
    this.hoveredLogs = [];
    return;
  }

  const hoverDateStr = this.formatDateToYMD(day.date);

  this.timesheet.getOrgLogins(this.orgId).subscribe({
    next: (logs: Log[]) => {
      this.hoveredLogs = (logs || []).filter(log => {
        const logDate = new Date(log.login_time);
        return this.formatDateToYMD(logDate) === hoverDateStr;
      });
    },
    error: (err) => {
      console.error('Error fetching logs:', err);
      this.hoveredLogs = [];
    }
  });
}


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
        this.tasks = res.filter(t => t.org_id == this.orgId);
        this.filteredTasks = [...this.tasks];
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
    if (this.form.invalid) return;

    const formValue = this.form.value;
    const payload: Task = {
      org_id: this.orgId,
      task_name: formValue.task_name,
      assign_date: formValue.assign_date,
      end_date: formValue.end_date,
      status: 'pending'
    };

    this.timesheet.addTask(payload).subscribe({
      next: (res: any) => {
        const newTask: Task = { id: res.id, ...payload };
        this.tasks.push(newTask);
        this.filteredTasks.push(newTask);
        this.form.reset();
        this.cdRef.detectChanges();
      },
      error: (err) => alert('Error adding task: ' + (err.error?.message || err.message))
    });
  }

  updateStatus(id: number, status: Task['status']) {
    this.timesheet.updateStatus(id, status).subscribe({
      next: () => {
        const task = this.tasks.find(t => t.id == id);
        if (task) task.status = status;
        const fTask = this.filteredTasks.find(t => t.id == id);
        if (fTask) fTask.status = status;
        this.cdRef.detectChanges();
      },
      error: (err) => alert('Error updating status: ' + (err.error?.message || err.message))
    });
  }

  filterTasks(status: 'all' | 'pending' | 'complete' | 'overdue') {
    this.filteredGraphStatus = status;
    this.filteredTasks = status === 'all'
      ? [...this.tasks]
      : this.tasks.filter(t => t.status === status);
    this.cdRef.detectChanges();
  }

  resetFilter() {
    this.filteredTasks = [...this.tasks];
    this.cdRef.detectChanges();
  }

  getTaskCount(status: string): number {
    return this.tasks.filter(t => t.status === status).length;
  }

  getPercentage(status: string): number {
    if (!this.tasks.length) return 0;
    const count = this.getTaskCount(status);
    return Math.round((count / this.tasks.length) * 100);
  }

  get percentPending() { return this.getPercentage('pending'); }
  get percentComplete() { return this.getPercentage('complete'); }
  get percentOverdue() { return this.getPercentage('overdue'); }

  get pendingCount() { return this.getTaskCount('pending'); }
  get completeCount() { return this.getTaskCount('complete'); }
  get overdueCount() { return this.getTaskCount('overdue'); }

  refreshView() { this.loadTasks(); }
  trackByTaskId(index: number, task: Task) { return task.id || index; }

  checkLoginRecords() {
    this.timesheet.getOrgLogins(this.orgId).subscribe({
      next: (response: Log[]) => {
        console.log('Login records response:', response);
      },
      error: (error) => console.error('Error checking login records:', error)
    });
  }

  debugDateComparisons() {
    const testLog: Log = {
      calendar_id: 6,
      org_id: 4,
      login_time: '2025-09-13 06:38:00',
      logout_time: '2025-09-13 06:38:00',
      org_name: 'Test Org'
    };

    const utcDate = new Date(testLog.login_time);
    const sept13 = new Date(2025, 8, 13);
    const isMatch = this.formatDateToYMD(utcDate) === this.formatDateToYMD(sept13);
    console.log('Hover date matches log date:', isMatch);
  }

  checkAllLogins() {
    this.timesheet.getOrgLogins(this.orgId).subscribe({
      next: (response: any) => {
        console.log('API Response:', response);
      },
      error: (error) => console.error('Error checking login records:', error)
    });
  }
}
