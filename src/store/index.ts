import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import foodReducer from './foodSlice';
import symptomsReducer from './symptomsSlice';
import bowelReducer from './bowelSlice';

export const store = configureStore({
  reducer: {
    food: foodReducer,
    symptoms: symptomsReducer,
    bowel: bowelReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch<AppDispatch>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;