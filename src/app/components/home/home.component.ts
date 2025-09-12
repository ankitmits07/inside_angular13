import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
@Component({
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  constructor(public auth: AuthService) {}
  ngOnInit(): void {}
    activeModule: string = 'employee'; // default

  onModuleChange(module: string) {
    this.activeModule = module;
  }
  
}

