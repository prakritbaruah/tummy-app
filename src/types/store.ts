// Centralize store types by re-exporting from the store module.
// Keeping this file allows existing imports to keep working without
// pulling in runtime code that could create circular dependencies.
export type { RootState, AppDispatch } from '@/store';