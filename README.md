# Tummy - Food & Symptom Tracker

A mobile app to help users track their food intake, symptoms, and identify potential food triggers.

## Features

- Log food and beverage consumption
- Track symptoms with severity levels
- Analyze correlations between food and symptoms
- View daily summaries and trends

## Tech Stack

- React Native with Expo
- TypeScript
- Redux Toolkit for state management
- React Navigation for routing
- React Native Paper for UI components

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tummy.git
cd tummy
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go app on your physical device

## Building for Production

### Prerequisites

- [Apple Developer Account](https://developer.apple.com/) with App Store Connect access
- [EAS CLI](https://docs.expo.dev/build/introduction/) installed globally
- App created in [App Store Connect](https://appstoreconnect.apple.com/) with bundle ID: `com.prakritbaruah.tummy`

### Setup

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure environment variables:**
   
   Set the required secrets in EAS (these are injected at build time):
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
   eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "your-openai-key"
   ```

### Build and Submit

1. **Build for iOS production:**
   ```bash
   eas build --platform ios --profile production
   ```
   
   This will:
   - Create a production build
   - Handle code signing automatically
   - Upload the build to EAS servers
   - Take approximately 15-30 minutes

2. **Submit to TestFlight:**
   ```bash
   eas submit -p ios --latest --profile production
   ```
   
   This submits the latest build to App Store Connect. Apple typically processes builds in 10-30 minutes.

3. **Invite testers in App Store Connect:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com/) → Your App → **TestFlight** tab
   - **Internal Testers**: Add team members (must be in your Apple Developer team)
   - **External Testers**: Create a group, add emails, and submit for Beta App Review (first time only)

### Build Profiles

- `development`: Development build with dev client
- `preview`: Internal distribution build
- `production`: Production build for TestFlight/App Store (auto-increments build number)

## Project Structure

```
tummy/
├── src/
│   ├── screens/         # Screen components
│   ├── store/          # Redux store and slices
│   ├── components/     # Reusable components
│   └── types/         # TypeScript type definitions
├── App.tsx            # Main app component
└── package.json       # Project dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 