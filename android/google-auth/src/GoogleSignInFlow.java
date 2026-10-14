package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class GoogleSignInFlow { private GoogleAuthState state=GoogleAuthState.IDLE; public synchronized GoogleAuthState state(){return state;} public synchronized void begin(){state=GoogleAuthState.LOADING;} public synchronized void success(){state=GoogleAuthState.SIGNED_IN;} public synchronized void cancel(){state=GoogleAuthState.CANCELED;} public synchronized void fail(){state=GoogleAuthState.ERROR;} public synchronized void signOut(){state=GoogleAuthState.SIGNED_OUT;} }
