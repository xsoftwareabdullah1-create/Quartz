package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
enum GoogleAuthError { USER_CANCELED, NETWORK_ERROR, CONFIGURATION_ERROR, TOKEN_REJECTED, SERVER_UNAVAILABLE, UNKNOWN }
