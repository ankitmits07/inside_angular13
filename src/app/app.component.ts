import { Component, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'project1_ci4';

  constructor(private auth: AuthService) {}

  // 🚨 Prevent tab close / refresh if logged in
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (this.auth.isLoggedIn()) {
      event.preventDefault();
      event.returnValue = '⚠️ You are still logged in. Please logout first!';
    }
  }
}
