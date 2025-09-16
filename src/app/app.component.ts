import { Component, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'project1_ci4';

  constructor(public auth: AuthService) {}

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (this.auth.isLoggedIn()) {
      event.preventDefault();
      event.returnValue = true; // Triggers generic browser warning
    }
  }
}
