import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CandidateService } from '../../services/candidate.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-candidate-wizard',
  templateUrl: './candidate-wizard.component.html',
  styleUrls: ['./candidate-wizard.component.css']
})
export class CandidateWizardComponent implements OnInit {
  step = 1;
  submitted = false;
  msg = '';

  form1: FormGroup;
  form2: FormGroup;

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  preview: any = {};

  orgId: number | null = null;
  existingCandidate: any = null;
  candidateId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private candidateSvc: CandidateService,
    private loc: LocationService
  ) {
    // Step 1: Basic Info
    this.form1 = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required]
    });

    // Step 2: Additional Info
    this.form2 = this.fb.group({
      address: ['', Validators.required],
      country: ['', Validators.required],
      state: ['', Validators.required],
      city: [''],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      img: [null] // optional here
    });
  }

  ngOnInit(): void {
    // Load countries
    this.loc.countries().subscribe(res => this.countries = res);

    // Get orgId from auth
    const auth = localStorage.getItem('auth');
    if (auth) {
      const u = JSON.parse(auth);
      this.orgId = u.id;
    }

    // Check if candidate already exists for org
    if (this.orgId) {
      this.candidateSvc.getByOrg(this.orgId).subscribe(res => {
        if (res) {
          this.existingCandidate = res;
          this.candidateId = res.id;

          // Prefill forms
          this.form1.patchValue({
            name: res.name,
            email: res.email,
            phone: res.phone
          });
          this.form2.patchValue({
            address: res.address,
            country: res.country,
            state: res.state,
            city: res.city,
            pincode: res.pincode,
            img: null
          });

          this.preview = {
            ...res,
            image: res.img_url
          };

          // Go straight to preview
          this.step = 3;
        }
      });
    }

    // Auto-save progress only for new candidate
    if (!this.existingCandidate) {
      this.form1.valueChanges.subscribe(() => this.saveProgress());
      this.form2.valueChanges.subscribe(() => this.saveProgress());
    }
  }

  /** Save progress in localStorage */
  private saveProgress(): void {
    if (this.existingCandidate) return;
    localStorage.setItem(
      'candidate-progress',
      JSON.stringify({
        form1: this.form1.value,
        form2: this.form2.value,
        step: this.step,
        preview: this.preview
      })
    );
  }

  /** Step navigation */
  nextFromStep1(): void {
    if (this.form1.invalid) {
      this.form1.markAllAsTouched();
      return;
    }
    this.step = 2;
    this.saveProgress();
  }

  prevFromStep2(): void {
    this.step = 1;
    this.saveProgress();
  }

  nextFromStep2(): void {
    if (this.form2.invalid) {
      this.form2.markAllAsTouched();
      return;
    }

    const countryObj = this.countries.find(c => c.id == this.form2.value.country);
    const stateObj = this.states.find(s => s.id == this.form2.value.state);
    const cityObj = this.cities.find(c => c.id == this.form2.value.city);

    this.preview = {
      ...this.form1.value,
      ...this.form2.value,
      country_name: countryObj?.country_name || '',
      state_name: stateObj?.state_name || '',
      city_name: cityObj?.city_name || '',
      image: this.preview.image || null
    };

    this.step = 3;
    this.saveProgress();
  }

  prevFromStep3(): void {
    this.step = 2;
    this.saveProgress();
  }

  /** Dropdowns */
  onCountryChange(event: Event): void {
    const id = +(event.target as HTMLSelectElement).value;
    this.form2.patchValue({ state: '', city: '' });
    this.states = [];
    this.cities = [];
    if (id) {
      this.loc.states(id).subscribe(res => this.states = res);
    }
  }

  onStateChange(event: Event): void {
    const id = +(event.target as HTMLSelectElement).value;
    this.form2.patchValue({ city: '' });
    this.cities = [];
    if (id) {
      this.loc.cities(id).subscribe(res => this.cities = res);
    }
  }

  /** File upload */
  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (file) {
      this.form2.patchValue({ img: file });

      const reader = new FileReader();
      reader.onload = () => {
        this.preview.image = reader.result as string;
        this.saveProgress();
      };
      reader.readAsDataURL(file);
    }
  }

  /** Submit (create or update via /store) */
  submit(): void {
    if (!this.orgId) {
      this.msg = 'Organization ID missing';
      return;
    }

    const fd = new FormData();
    fd.append('org_id', String(this.orgId));

    Object.entries(this.form1.value).forEach(([k, v]) => fd.append(k, String(v ?? '')));
    Object.entries(this.form2.value).forEach(([k, v]) => {
      if (k === 'img' && v) {
        fd.append('img', v as any);
      } else {
        fd.append(k, String(v ?? ''));
      }
    });

    this.candidateSvc.createOrUpdate(fd).subscribe({
      next: () => {
        this.submitted = true;
        this.msg = this.existingCandidate
          ? 'Candidate updated successfully'
          : 'Candidate created successfully';
        localStorage.removeItem('candidate-progress');
      },
      error: (err: any) => {
        this.submitted = true;
        this.msg = err?.error?.message || 'Failed to save candidate';
      }
    });
  }

  /** Getters */
  get f1() { return this.form1.controls; }
  get f2() { return this.form2.controls; }

  /** Progress circle */
  get progress(): number {
    const fields = { ...this.form1.value, ...this.form2.value };
    const total = Object.keys(fields).length;
    const filled = Object.values(fields).filter(v => v).length;
    return total ? Math.round((filled / total) * 100) : 0;
  }

  get stepClass(): string {
    return this.step === 1 ? 'step1' : this.step === 2 ? 'step2' : 'step3';
  }

  setStep(stepNum: number): void {
    this.step = stepNum;
    this.saveProgress();
  }
}
