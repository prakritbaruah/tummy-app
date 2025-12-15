import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FoodEntry, FoodState } from '../types/food';
import { createFoodEntry, listFoodEntries } from '../data/foodRepo';

const initialState: FoodState = {
  entries: [],
  status: 'idle',
  error: null,
};

export const fetchFoodEntries = createAsyncThunk(
  'food/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await listFoodEntries();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load food entries');
    }
  },
);

export const addFoodEntryAsync = createAsyncThunk(
  'food/add',
  async (entry: FoodEntry, { rejectWithValue }) => {
    try {
      return await createFoodEntry(entry);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save food entry');
    }
  },
);

const foodSlice = createSlice({
  name: 'food',
  initialState,
  reducers: {
    addFoodEntryLocal: (state, action: PayloadAction<FoodEntry>) => {
      state.entries.push(action.payload);
    },
    removeFoodEntryLocal: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(entry => entry.id !== action.payload);
    },
    clearFoodError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFoodEntries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFoodEntries.fulfilled, (state, action: PayloadAction<FoodEntry[]>) => {
        state.status = 'idle';
        state.entries = action.payload;
      })
      .addCase(fetchFoodEntries.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to fetch food entries';
      })
      .addCase(addFoodEntryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addFoodEntryAsync.fulfilled, (state, action: PayloadAction<FoodEntry>) => {
        state.status = 'idle';
        state.entries.push(action.payload);
      })
      .addCase(addFoodEntryAsync.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to save food entry';
      })
  },
});

export const { addFoodEntryLocal, removeFoodEntryLocal, clearFoodError } = foodSlice.actions;
export default foodSlice.reducer; 