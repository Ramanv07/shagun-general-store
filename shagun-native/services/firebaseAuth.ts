/**
 * Native mobile stub for Google Web Sign-In.
 * On Android/iOS, firebase/auth is NOT loaded to prevent Hermes runtime crashes.
 * Google 1-click on mobile is handled via native credentials or direct phone/email login.
 */

export const signInWithGoogleWeb = async (): Promise<any> => {
  throw new Error('Google Sign-In popup is only supported in web mode. Please sign in with your email or mobile number.');
};
