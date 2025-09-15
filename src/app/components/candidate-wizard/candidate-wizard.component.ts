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
      city: ['',Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      img: [null] // optional here
    });
  }

  ngOnInit(): void {
    // Load countries
    this.loc.countries().subscribe(res => {
      this.countries = res;
      
      // Check for saved progress after countries are loaded
      this.checkSavedProgress();
    });

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
            img: res.img_url
          });

          // Load states and cities for the existing candidate
          if (res.country) {
            this.loc.states(res.country).subscribe(states => {
              this.states = states;
              
              if (res.state) {
                this.loc.cities(res.state).subscribe(cities => {
                  this.cities = cities;
                  
                  // Create preview with names
                  this.updatePreviewWithNames();
                  
                  // Set the image from existing candidate
                  if (res.img_url) {
                    this.preview.image = res.img_url;
                  }
                  this.saveProgress();
                });
              } else {
                this.updatePreviewWithNames();
                if (res.img_url) {
                  this.preview.image = res.img_url;
                }
                this.saveProgress();
              }
            });
          } else {
            this.updatePreviewWithNames();
            if (res.img_url) {
              this.preview.image = res.img_url;
            }
            this.saveProgress();
          }
          
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

  /** Check for saved progress in localStorage */
  private checkSavedProgress(): void {
    const saved = localStorage.getItem('candidate-progress');
    if (saved) {
      const progress = JSON.parse(saved);
      
      // Restore form values
      this.form1.patchValue(progress.form1);
      this.form2.patchValue(progress.form2);
      
      // Restore step
      this.step = progress.step || 1;
      
      // Restore preview with image (if it's a data URL or full URL)
      this.preview = progress.preview || {};
      
      // If we're on step 3 or preview has data, load location names
      if (this.step === 3 || this.preview.country) {
        this.loadLocationNamesForPreview();
      }
      
      // Load states and cities based on saved country/state
      if (progress.form2.country) {
        this.loc.states(progress.form2.country).subscribe(states => {
          this.states = states;
          
          if (progress.form2.state) {
            this.loc.cities(progress.form2.state).subscribe(cities => {
              this.cities = cities;
            });
          }
        });
      }
    }
  }
  
  /** Load location names for preview */
  private loadLocationNamesForPreview(): void {
    const countryId = this.form2.value.country;
    const stateId = this.form2.value.state;
    const cityId = this.form2.value.city;
    
    if (countryId) {
      const countryObj = this.countries.find(c => c.id == countryId);
      this.preview.country_name = countryObj?.country_name || '';
      
      if (stateId && this.states.length) {
        const stateObj = this.states.find(s => s.id == stateId);
        this.preview.state_name = stateObj?.state_name || '';
        
        if (cityId && this.cities.length) {
          const cityObj = this.cities.find(c => c.id == cityId);
          this.preview.city_name = cityObj?.city_name || '';
        }
      }
    }
  }
  
  /** Update preview with location names */
  private updatePreviewWithNames(): void {
    const countryObj = this.countries.find(c => c.id == this.form2.value.country);
    const stateObj = this.states.find(s => s.id == this.form2.value.state);
    const cityObj = this.cities.find(c => c.id == this.form2.value.city);

    this.preview = {
      ...this.form1.value,
      ...this.form2.value,
      country_name: countryObj?.country_name || '',
      state_name: stateObj?.state_name || '',
      city_name: cityObj?.city_name || '',
      image: this.preview.image || null // Preserve the existing image
    };
  }

  /** Save progress in localStorage */
  private saveProgress(): void {
    if (this.existingCandidate) return;
    
    // Update preview with current data before saving
    if (this.step >= 2) {
      this.updatePreviewWithNames();
    }
    
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

    this.updatePreviewWithNames();
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
    this.saveProgress();
  }

  onStateChange(event: Event): void {
    const id = +(event.target as HTMLSelectElement).value;
    this.form2.patchValue({ city: '' });
    this.cities = [];
    if (id) {
      this.loc.cities(id).subscribe(res => this.cities = res);
    }
    this.saveProgress();
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

  /** Handle image loading errors */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
  }

  /** Submit (create or update via /store) */
 // In your submit method, update the preview image with the response URL
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
    next: (response: any) => {
      this.submitted = true;
      this.msg = this.existingCandidate
        ? 'Candidate updated successfully'
        : 'Candidate created successfully';
      
      // Update the existing candidate with the response data
      if (response.candidate) {
        this.existingCandidate = response.candidate;
        // Use the full image URL from the server response
        this.preview.image = response.candidate.img_url;
      }
      
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