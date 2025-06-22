# Authentication Implementation Todo List

## Overview
This todo list guides the implementation of user authentication using Supabase Auth in the React Native Expo app "Tummy". Follow each phase sequentially for best results.

---

## Phase 1: Setup & Dependencies

### Supabase Setup
- [x] Create Supabase project at https://supabase.com/dashboard
- [x] Note down your project URL and anon key
- [x] Enable Authentication in Supabase dashboard
- [x] Configure authentication providers:
  - [x] Email/Password authentication (enabled by default)
  - [ ] (Optional) Google OAuth
  - [ ] (Optional) Apple OAuth
- [ ] Configure email templates in Auth > Settings
- [ ] Set up custom SMTP (optional, for branded emails)

### Install Dependencies
- [x] Install Supabase SDK: `npx expo install @supabase/supabase-js`
- [x] Install URL polyfill: `npx expo install react-native-url-polyfill` 
- [x] Verify AsyncStorage is installed (already in package.json)
- [ ] Optional: Install additional dependencies: `npx expo install expo-crypto expo-linking`

---

## Phase 2: Core Authentication Infrastructure

### Supabase Configuration
- [x] Create `src/config/supabase.ts`
  - [x] Initialize Supabase client
  - [x] Export supabase instance
  - [x] Add Supabase project URL and anon key
  - [x] Import URL polyfill at top of file
- [ ] Create `src/config/supabaseConfig.ts` for environment-specific configs
- [ ] Create environment variables file (`.env`) with Supabase credentials

### Database Schema Setup
- [x] Create database tables in Supabase SQL Editor:
  - [x] Create `profiles` table for user profiles
  - [x] Create `food_entries` table with user_id foreign key (matches FoodEntry type)
  - [x] Create `symptom_entries` table with user_id foreign key (matches SymptomEntry type)
  - [x] Create `bowel_entries` table with user_id foreign key (matches BowelEntry type)
- [x] Set up Row Level Security (RLS) policies:
  - [x] Enable RLS on all tables
  - [x] Create policies for user data isolation
  - [x] Test policies with different user scenarios

### Authentication Service Layer
- [x] Create `src/services/authService.ts`
  - [x] Implement `signUp(email, password)` function
  - [x] Implement `signIn(email, password)` function
  - [x] Implement `signOut()` function
  - [x] Implement `resetPassword(email)` function
  - [x] Implement `getCurrentUser()` function
  - [x] Implement `onAuthStateChange()` listener setup
  - [x] Add user profile creation on signup

### Redux Authentication State
- [x] Create `src/store/authSlice.ts`
  - [x] Define auth state interface (user, loading, error, isAuthenticated)
  - [x] Create async thunks for auth actions
  - [x] Implement reducers for auth state changes
  - [x] Add error handling and loading states
- [x] Update `src/store/index.ts`
  - [x] Import and add authReducer to store
  - [x] Export auth-related types

### Authentication Hook
- [x] Create `src/hooks/useAuth.ts`
  - [x] Implement custom hook that uses Redux auth state
  - [x] Add helper functions for auth actions
  - [x] Include auth persistence logic
  - [x] Add session management helpers

### TypeScript Types Generation
- [ ] Generate TypeScript types from database schema:
  - [ ] Install Supabase CLI: `npm install -g supabase`
  - [ ] Run: `supabase gen types typescript --project-id [PROJECT_ID] > src/types/supabase.ts`
  - [ ] Create `src/types/database.ts` with custom types
  - [ ] Export types for components to use

---

## Phase 3: UI Components & Screens

### Authentication Screens
- [x] Create `src/screens/auth/LoginScreen.tsx`
  - [x] Email/password input fields
  - [x] Login button with loading state
  - [x] "Forgot Password" link
  - [x] "Sign Up" navigation link
  - [x] Form validation
  - [x] Error display
- [x] Create `src/screens/auth/SignupScreen.tsx`
  - [x] Email/password/confirm password fields
  - [x] Sign up button with loading state
  - [x] "Already have account" navigation link
  - [x] Form validation (password strength, email format)
  - [x] Error display
- [x] Create `src/screens/auth/ForgotPasswordScreen.tsx`
  - [x] Email input field
  - [x] Send reset email button
  - [x] Success/error messaging
  - [x] Back to login navigation

### Authentication Components
- [x] Create `src/components/auth/AuthGuard.tsx`
  - [x] Wrap protected components
  - [x] Redirect to auth screens if not authenticated
- [x] Create `src/components/auth/LoadingScreen.tsx`
  - [x] Display while checking auth state
  - [x] Show app logo and loading indicator

### Profile Management
- [x] Create `src/screens/ProfileScreen.tsx`
  - [x] Display user information
  - [x] Sign out button
  - [x] Account settings options (placeholder)
  - [x] Data export/import options (placeholder)

---

## Phase 4: Navigation Updates

### Authentication Flow Navigation
- [x] Create `src/navigation/AuthNavigator.tsx`
  - [x] Stack navigator for auth screens
  - [x] Include Login, Signup, ForgotPassword screens
- [x] Update `App.tsx`
  - [x] Add conditional navigation based on auth state
  - [x] Implement auth state checking on app start
  - [x] Show loading screen while checking auth
- [x] Add Profile tab to main navigation
  - [x] Update `TabNavigator` in `App.tsx`
  - [x] Add profile icon and screen

---

## Phase 5: Data Architecture Updates

### Multi-User Data Support
- [ ] Update `src/store/foodSlice.ts`
  - [ ] Replace AsyncStorage with Supabase queries
  - [ ] Use RLS for automatic user data filtering
  - [ ] Update all food-related actions to use database
  - [ ] Add real-time subscriptions for food data
- [ ] Update `src/store/symptomsSlice.ts`
  - [ ] Replace AsyncStorage with Supabase queries
  - [ ] Use RLS for automatic user data filtering
  - [ ] Update all symptom-related actions to use database
  - [ ] Add real-time subscriptions for symptom data
- [ ] Update `src/store/bowelSlice.ts`
  - [ ] Replace AsyncStorage with Supabase queries
  - [ ] Use RLS for automatic user data filtering
  - [ ] Update all bowel-related actions to use database
  - [ ] Add real-time subscriptions for bowel data

### Database Service Layer
- [ ] Create `src/services/databaseService.ts`
  - [ ] Implement CRUD operations for each data type
  - [ ] Add real-time subscription helpers
  - [ ] Handle offline/online state
  - [ ] Add data validation before database operations

### Data Migration Strategy
- [ ] Create migration script for existing AsyncStorage data
- [ ] Implement user-specific data loading on login
- [ ] Clear local storage on logout (keep only essential data)
- [ ] Add offline data sync when connection restored

---

## Phase 6: Real-time Features & Advanced Database

### Real-time Subscriptions
- [ ] Implement real-time data updates in Redux slices
  - [ ] Subscribe to food_entries changes
  - [ ] Subscribe to symptom_entries changes
  - [ ] Subscribe to bowel_entries changes
- [ ] Handle subscription cleanup on logout/unmount
- [ ] Add connection status indicators
- [ ] Implement optimistic updates for better UX

### Advanced Database Features
- [ ] Create database functions for complex queries:
  - [ ] Daily/weekly/monthly data aggregations
  - [ ] Symptom pattern analysis
  - [ ] Food correlation reports
- [ ] Set up database triggers for data validation
- [ ] Create indexes for performance optimization
- [ ] Implement data backup/export functionality

---

## Phase 7: Security & Error Handling

### Authentication Guards
- [ ] Implement route protection
  - [ ] Wrap main app with AuthGuard
  - [ ] Redirect unauthenticated users
- [ ] Add token refresh handling
- [ ] Implement auto-logout on token expiry

### Error Handling
- [ ] Add comprehensive error handling to auth service
- [ ] Implement user-friendly error messages
- [ ] Add retry mechanisms for network errors
- [ ] Log authentication events for debugging

### Security Best Practices
- [ ] Implement proper password validation
- [ ] Verify RLS policies are working correctly
- [ ] Test data isolation between different users
- [ ] Validate user input on all forms
- [ ] Implement API rate limiting (if using custom endpoints)
- [ ] Secure sensitive data in AsyncStorage (use encryption if needed)
- [ ] Test SQL injection prevention in custom queries

---

## Phase 8: Testing & Polish

### Authentication Testing
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test password reset flow
- [ ] Test logout functionality
- [ ] Test auth persistence across app restarts

### User Experience
- [ ] Add smooth loading transitions
- [ ] Implement proper keyboard handling
- [ ] Add accessibility labels
- [ ] Test on both iOS and Android
- [ ] Optimize for different screen sizes

### Data Migration
- [ ] Create migration script for existing data
- [ ] Test user onboarding flow
- [ ] Verify data isolation between users

---

## Phase 9: Advanced Features (Future)

### Social Authentication
- [ ] Configure Google OAuth in Supabase dashboard
- [ ] Configure Apple OAuth in Supabase dashboard
- [ ] Add social provider UI options
- [ ] Handle OAuth redirects in mobile app
- [ ] Test social login flows on both platforms

### Account Management
- [ ] Email verification flow
- [ ] Change password functionality
- [ ] Delete account option
- [ ] Export user data

### Enhanced Security
- [ ] Two-factor authentication
- [ ] Biometric login options
- [ ] Session management

---

## Notes for Implementation

### Environment Variables
- Store Supabase URL and anon key in environment variables
- Use different Supabase projects for development/production
- Keep service role key secure (never expose in client code)

### Testing Strategy
- Test authentication flows thoroughly
- Verify Row Level Security policies work correctly
- Test data isolation between users
- Test real-time subscriptions
- Test offline scenarios with local storage fallback

### Performance Considerations
- Implement proper loading states
- Optimize database queries with indexes
- Use Supabase query caching
- Implement pagination for large datasets
- Monitor real-time subscription performance

### Deployment Checklist
- [ ] Configure Supabase for production environment
- [ ] Set up custom domain (optional)
- [ ] Configure SMTP for production emails
- [ ] Test authentication in production build
- [ ] Monitor database performance and usage
- [ ] Set up database backups
- [ ] Configure alerting for errors

---

## Success Criteria

✅ **Phase Complete When:**
- Users can create accounts and sign in/out reliably
- Row Level Security properly isolates user data
- Real-time subscriptions work correctly
- Auth state persists across app sessions
- Database queries are optimized and performant
- All existing functionality migrated to Supabase
- TypeScript types are generated and working
- Error handling provides clear user feedback
- Offline scenarios handled gracefully

## Supabase-Specific Benefits

### ✅ **Advantages of Supabase Implementation:**
- **PostgreSQL database** - Structured, relational data perfect for health tracking
- **Real-time subscriptions** - Instant data sync across devices
- **Row Level Security** - Built-in user data isolation
- **TypeScript support** - Auto-generated types from schema
- **Generous free tier** - 500MB database, 2GB bandwidth
- **Open source** - No vendor lock-in, can self-host
- **SQL-based** - Familiar query language and tools
- **Built-in REST API** - No backend code needed

### 🎯 **Perfect for Health Tracking Apps:**
- Structured data relationships (users → meals → symptoms)
- Real-time data synchronization
- Complex queries for health analytics
- Data integrity with database constraints
- Scalable architecture for growth 