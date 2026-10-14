package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
enum GoogleAuthState { IDLE, LOADING, SIGNED_IN, SIGNED_OUT, CANCELED, ERROR }
