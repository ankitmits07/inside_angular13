import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ModuleService } from '../../services/module.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Output() moduleChange = new EventEmitter<string>(); 

  active: string = '';
  modules: any[] = [];

  constructor(
    private moduleSvc: ModuleService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const orgId = this.auth.getOrgId();
    if (orgId) {
      this.moduleSvc.list(orgId).subscribe({
        next: (res: any[]) => {
          this.modules = res;
          if (this.modules.length) {
            this.active = (this.modules[0].module_name || '').toLowerCase();
            this.moduleChange.emit(this.active); 
          }
        },
        error: (err) => {
          console.error('Failed to load modules:', err);
        }
      });
    }
  }

  setActive(section: string): void {
    this.active = section;
    this.moduleChange.emit(section); 
  }
}
