package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class AuthUiMessage { private AuthUiMessage(){} public static String forError(GoogleAuthError e){if(e==GoogleAuthError.USER_CANCELED)return "Sign-in canceled.";if(e==GoogleAuthError.NETWORK_ERROR)return "Check your connection and try again.";if(e==GoogleAuthError.CONFIGURATION_ERROR)return "Google sign-in is not configured correctly.";if(e==GoogleAuthError.SERVER_UNAVAILABLE)return "Quartz sign-in is temporarily unavailable.";return "Sign-in could not be completed. Please try again.";} }
