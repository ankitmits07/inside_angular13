export interface Location {
}
export interface Country {
  id: number;
  country_name: string;
}

export interface State {
  id: number;
  state_name: string;
  country_id: number;
}

export interface City {
  id: number;
  city_name: string;
  state_id: number;
}