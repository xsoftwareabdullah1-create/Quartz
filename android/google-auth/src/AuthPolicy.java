package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class AuthPolicy { private AuthPolicy(){} public static final boolean VERIFY_TOKEN_ON_SERVER=true; public static final boolean CLIENT_SECRET_IN_APK=false; public static final boolean LOG_TOKENS=false; public static final boolean REQUIRE_HTTPS=true; }
