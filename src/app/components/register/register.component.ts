import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  form = this.fb.group({
    org_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  error = ''; success = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    this.auth.register(this.form.value as any).subscribe({
      next: () => {
        this.success = 'Organization registered. Please login.';
        setTimeout(() => this.router.navigate(['/login']), 800);
      },
      error: err => this.error = err?.error?.messages || err?.error?.message || 'Register failed'
    });
  }
}
