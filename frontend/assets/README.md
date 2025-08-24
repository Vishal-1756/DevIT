# Assets

This folder contains the static assets for your Expo React Native app.

## Required Files (generated automatically by Expo):
- icon.png (1024x1024) - App icon
- splash.png (1242x2436) - Splash screen image  
- adaptive-icon.png (1024x1024) - Android adaptive icon
- favicon.png (48x48) - Web favicon

## Adding Custom Assets:
1. Place images, fonts, and other assets in this folder
2. Import them in your components:
   ```typescript
   import logo from '../assets/logo.png';
   <Image source={logo} />
   ```

Expo will automatically generate the required app icons and splash screens when you build your app.