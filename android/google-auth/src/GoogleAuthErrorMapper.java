package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class GoogleAuthErrorMapper { private GoogleAuthErrorMapper(){} public static GoogleAuthError map(int code){if(code==16)return GoogleAuthError.USER_CANCELED;if(code==7||code==8)return GoogleAuthError.NETWORK_ERROR;if(code==10)return GoogleAuthError.CONFIGURATION_ERROR;return GoogleAuthError.UNKNOWN;} }
