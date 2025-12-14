import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BowelEntry, BowelState } from '../types/bowel';
import { createBowelEntry, listBowelEntries } from '../data/bowelRepo';

const initialState: BowelState = {
  entries: [],
  status: 'idle',
  error: null,
};

export const fetchBowelEntries = createAsyncThunk(
  'bowel/fetchAll',
  async (userId: string | undefined, { rejectWithValue }) => {
    try {
      return await listBowelEntries(userId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bowel entries');
    }
  },
);

export const addBowelEntryAsync = createAsyncThunk(
  'bowel/add',
  async (params: { entry: BowelEntry; userId?: string }, { rejectWithValue }) => {
    try {
      return await createBowelEntry(params.entry, params.userId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save bowel entry');
    }
  },
);

const bowelSlice = createSlice({
  name: 'bowel',
  initialState,
  reducers: {
    addBowelEntryLocal: (state, action: PayloadAction<BowelEntry>) => {
      state.entries.push(action.payload);
    },
    clearBowelError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBowelEntries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBowelEntries.fulfilled, (state, action: PayloadAction<BowelEntry[]>) => {
        state.status = 'idle';
        state.entries = action.payload;
      })
      .addCase(fetchBowelEntries.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to fetch bowel movemententries';
      })
      .addCase(addBowelEntryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addBowelEntryAsync.fulfilled, (state, action: PayloadAction<BowelEntry>) => {
        state.status = 'idle';
        state.entries.push(action.payload);
      })
      .addCase(addBowelEntryAsync.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to save bowel movement entry';
      });
  },
});

export const { addBowelEntryLocal, clearBowelError } = bowelSlice.actions;
export default bowelSlice.reducer; 