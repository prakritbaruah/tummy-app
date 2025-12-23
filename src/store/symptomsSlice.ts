import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SymptomEntry, SymptomsState } from '@/types/symptoms';
import { createSymptomEntry, listSymptomEntries, updateSymptomEntryDeletedAt } from '@/data/symptomsRepo';

const initialState: SymptomsState = {
  entries: [],
  status: 'idle',
  error: null,
};

export const fetchSymptomEntries = createAsyncThunk(
  'symptoms/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await listSymptomEntries();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load symptom entries',
      );
    }
  },
);

export const addSymptomEntryAsync = createAsyncThunk(
  'symptoms/add',
  async (entry: SymptomEntry, { rejectWithValue }) => {
    try {
      return await createSymptomEntry(entry);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save symptom');
    }
  },
);

export const deleteSymptomEntryAsync = createAsyncThunk(
  'symptoms/delete',
  async (entryId: string, { rejectWithValue }) => {
    try {
      await updateSymptomEntryDeletedAt(entryId, new Date());
      return entryId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete symptom entry');
    }
  },
);

const symptomsSlice = createSlice({
  name: 'symptoms',
  initialState,
  reducers: {
    addSymptomEntryLocal: (state, action: PayloadAction<SymptomEntry>) => {
      state.entries.push(action.payload);
    },
    clearSymptomError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSymptomEntries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSymptomEntries.fulfilled, (state, action: PayloadAction<SymptomEntry[]>) => {
        state.status = 'idle';
        state.entries = action.payload;
      })
      .addCase(fetchSymptomEntries.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to fetch symptom entries';
      })
      .addCase(addSymptomEntryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addSymptomEntryAsync.fulfilled, (state, action: PayloadAction<SymptomEntry>) => {
        state.status = 'idle';
        state.entries.push(action.payload);
      })
      .addCase(addSymptomEntryAsync.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to save symptom entry';
      })
      .addCase(deleteSymptomEntryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteSymptomEntryAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.status = 'idle';
        state.entries = state.entries.filter((entry) => entry.id !== action.payload);
      })
      .addCase(deleteSymptomEntryAsync.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to delete symptom entry';
      });
  },
});

export const { addSymptomEntryLocal, clearSymptomError } = symptomsSlice.actions;
export default symptomsSlice.reducer; 