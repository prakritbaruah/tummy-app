import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BowelEntry, BowelState } from '@/types/bowel';
import { createBowelEntry, listBowelEntries, updateBowelEntryDeletedAt } from '@/data/bowelRepo';

const initialState: BowelState = {
  entries: [],
  status: 'idle',
  error: null,
};

export const fetchBowelEntries = createAsyncThunk(
  'bowel/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await listBowelEntries();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load bowel entries');
    }
  },
);

export const addBowelEntryAsync = createAsyncThunk(
  'bowel/add',
  async (entry: BowelEntry, { rejectWithValue }) => {
    try {
      return await createBowelEntry(entry);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save bowel entry');
    }
  },
);

export const deleteBowelEntryAsync = createAsyncThunk(
  'bowel/delete',
  async (entryId: string, { rejectWithValue }) => {
    try {
      await updateBowelEntryDeletedAt(entryId, new Date());
      return entryId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete bowel entry');
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
      })
      .addCase(deleteBowelEntryAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteBowelEntryAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.status = 'idle';
        state.entries = state.entries.filter((entry) => entry.id !== action.payload);
      })
      .addCase(deleteBowelEntryAsync.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Unable to delete bowel entry';
      });
  },
});

export const { addBowelEntryLocal, clearBowelError } = bowelSlice.actions;
export default bowelSlice.reducer; 