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

  months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  orgId = 3;
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
    const today = new Date(); today.setHours(0,0,0,0);
    return date.getTime() <= today.getTime();
  }

  /** ---------------- Hover ---------------- */
  hoverDate(day: MonthDay | null) {
    if (!day || !this.canHover(day.date)) {
      this.hoveredLog = null;
      return;
    }

    const hoverDateStr = day.date.toISOString().split('T')[0];
    console.log('Hovering on date:', hoverDateStr);

    // Fetch only latest log for the org
    this.timesheet.getOrgLogins(this.orgId).subscribe(
      latestLog => {
        console.log('Fetched latest log:', latestLog);

        if (!latestLog || !latestLog.login_time) {
          this.hoveredLog = null;
          return;
        }

        const logDateStr = new Date(latestLog.login_time).toISOString().split('T')[0];

        // Show log only if hovered date matches log date
        this.hoveredLog = (hoverDateStr === logDateStr) ? latestLog : null;

        if (this.hoveredLog) {
          console.log('Hovered log matches:', this.hoveredLog);
        } else {
          console.log('No log for hovered date');
        }
      },
      error => {
        console.error('Error fetching latest log:', error);
        this.hoveredLog = null;
      }
    );
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
}