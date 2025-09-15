import { Component, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  templateUrl: './login.component.html'
})
export class LoginComponent {
  form: FormGroup;
  error = '';
  isLoggedIn = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      org_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) return;

    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 6 = Saturday
    const date = today.getDate();

    // Check if it's Sunday or 1st or 3rd Saturday
    if (day === 0) {
      alert("It's Sunday! You cannot login today.");
      return;
    }
    if (day === 6) {
      const week = Math.ceil(date / 7);
      if (week === 1 || week === 3) {
        alert("It's 1st or 3rd Saturday! You cannot login today.");
        return;
      }
    }

    this.auth.login(this.form.value).subscribe({
    next: (res) => {
      if (res.status === 'success') {
        this.auth.setAuth(res);
        this.isLoggedIn = true;

        console.log('Login successful, organization ID:', res.id);

        // Log login in calendar_log table
        this.auth.logLogin(res.id).subscribe({
          next: (logResponse) => {
            console.log('Calendar log response:', logResponse);
            
            if (logResponse && logResponse.calendar_id) {
              localStorage.setItem('calendar_id', logResponse.calendar_id.toString());
              console.log('Calendar ID stored:', logResponse.calendar_id);
            } else {
              console.error('No calendar_id in response:', logResponse);
            }
          },
          error: (logError) => {
            console.error('Error logging calendar entry:', logError);
          }
        });

        this.router.navigate(['/home']);
      } else {
        this.error = res.message || 'Login failed';
      }
    },
    error: (err) => {
      this.error = err.error?.message || 'Login failed';
    }
  });
}

  //Prevent tab close / refresh if logged in
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (this.auth.isLoggedIn()) {
      event.preventDefault();
      event.returnValue = '⚠️ You are still logged in. Please logout first!';
    }
  }
}
