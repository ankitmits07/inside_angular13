import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { UserFormService } from '../../services/user-form.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  backendErrors: any = {};
  isLoading = false;
  showUserTable = false;
  users: any[] = [];
  apiUrl = environment.apiUrl;
  step = 1;
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private userFormService: UserFormService,
    private locationService: LocationService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      name: [''],
      email: [''],
      password: [''],
      country: [null],
      state: [null],
      city: [''],
      pincode: [''],
      phone: [''],
      image: [null]
    });
  }

  ngOnInit(): void {
    this.loadCountries();

    // Watch for country change → load states
    this.userForm.get('country')?.valueChanges.subscribe((country: any) => {
      this.resetMessages();
      if (country && country.id) {
        this.loadStates(country.id);
      } else {
        this.states = [];
        this.cities = [];
        this.userForm.patchValue({ state: null, city: '' });
      }
    });

    // Watch for state change → load cities
    this.userForm.get('state')?.valueChanges.subscribe((state: any) => {
      this.resetMessages();
      if (state && state.id) {
        this.loadCities(state.id);
      } else {
        this.cities = [];
        this.userForm.patchValue({ city: '' });
      }
    });
  }

  private resetMessages(): void {
    this.backendErrors = {};
    this.successMessage = '';
  }

  loadCountries(): void {
    this.locationService.countries().subscribe(
      (data: any) => {
        this.countries = data;
      },
      () => {
        console.error('Error loading countries');
        // fallback mock
        this.countries = [
          { id: 1, name: 'United States' },
          { id: 2, name: 'India' },
          { id: 3, name: 'Canada' }
        ];
      }
    );
  }

  loadStates(countryId: number): void {
    this.locationService.states(countryId).subscribe(
      (data: any) => {
        this.states = data || [];
        this.cities = [];
        this.userForm.patchValue({ state: null, city: '' });
      },
      () => {
        console.error('Error loading states');
        this.states = [];
        this.cities = [];
        this.userForm.patchValue({ state: null, city: '' });
      }
    );
  }

  loadCities(stateId: number): void {
    this.locationService.cities(stateId).subscribe(
      (data: any) => {
        this.cities = data || [];
        this.userForm.patchValue({ city: '' });
      },
      () => {
        console.error('Error loading cities');
        this.cities = [];
        this.userForm.patchValue({ city: '' });
      }
    );
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.userForm.patchValue({ image: file });

      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = reader.result);
      reader.readAsDataURL(file);
    }
  }

  nextStep(): void {
    if (this.isStepValid(this.step)) this.step++;
  }

  prevStep(): void {
    if (this.step > 1) this.step--;
  }

  isStepValid(step: number): boolean {
    const v = this.userForm.value;
    if (step === 1) {
      return !!(v.name && v.email && v.password);
    }
    if (step === 2) {
      if (!v.country) return false;
      if (this.states.length > 0) {
        return !!v.state;
      }
      return !!v.city;
    }
    if (step === 3) {
      return (
        !!v.pincode &&
        v.pincode.toString().length === 6 &&
        !!v.phone &&
        v.phone.toString().length >= 10 &&
        !!this.selectedFile
      );
    }
    return true;
  }

  isFormValid(): boolean {
    return this.isStepValid(1) && this.isStepValid(2) && this.isStepValid(3);
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.backendErrors = {
        general: 'Please complete all required fields before submitting.'
      };
      return;
    }

    this.isLoading = true;
    this.resetMessages();

    const formValues = this.userForm.value;
    const formData = new FormData();

    formData.append('name', formValues.name || '');
    formData.append('email', formValues.email || '');
    formData.append('password', formValues.password || '');

  const countryName = formValues.country ? formValues.country.country_name : '';
formData.append('country', countryName);

const stateName = formValues.state ? formValues.state.state_name : '';
formData.append('state', stateName);

let cityName = '';
if (this.cities && this.cities.length > 0) {
  if (formValues.city && typeof formValues.city === 'object') {
    cityName = formValues.city.city_name;
  } else {
    cityName = formValues.city || '';
  }
} else {
  cityName = formValues.city || '';
}
formData.append('city', cityName);


    formData.append('pincode', formValues.pincode || '');
    formData.append('phone', formValues.phone || '');

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.userFormService.createUser(formData).subscribe(
      (response: any) => {
        this.isLoading = false;
        if (response?.messages?.success) {
          this.successMessage = response.messages.success;
        } else {
          this.successMessage = 'User created successfully.';
        }
        if (response.data) {
          this.users.push(response.data);
        }
        this.resetForm();
      },
      (error: any) => {
        this.isLoading = false;
        console.error('Form submission error:', error);
        if (error.error) {
          this.backendErrors = error.error;
        } else if (error.message) {
          this.backendErrors = { general: error.message };
        } else {
          this.backendErrors = {
            general: 'An error occurred. Please try again.'
          };
        }
      }
    );
  }

  private resetForm(): void {
    this.userForm.reset();
    this.previewUrl = null;
    this.selectedFile = null;
    this.step = 1;
  }

  hasError(control: string, error: string): boolean {
    return (
      this.userForm.get(control)?.hasError(error) &&
      this.userForm.get(control)?.touched
    ) || false;
  }

  getBackendError(control: string): string | null {
    return this.backendErrors?.[control] || null;
  }

  toggleView(): void {
    this.showUserTable = !this.showUserTable;
    if (this.showUserTable) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.userFormService.getUsers().subscribe(
      (data: any) => (this.users = data),
      (error: any) => console.error('Error loading users', error)
    );
  }
}
