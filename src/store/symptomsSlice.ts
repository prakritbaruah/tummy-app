import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SymptomEntry, SymptomsState } from '@/../types/symptoms';

const initialState: SymptomsState = {
  entries: [],
};

const symptomsSlice = createSlice({
  name: 'symptoms',
  initialState,
  reducers: {
    addSymptomEntry: (state, action: PayloadAction<SymptomEntry>) => {
      state.entries.push(action.payload);
    },
  },
});

export const { addSymptomEntry } = symptomsSlice.actions;
export default symptomsSlice.reducer; 