package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class GoogleIdentity { private final String token,email,name; public GoogleIdentity(String t,String e,String n){if(t==null||t.trim().isEmpty())throw new IllegalArgumentException("token required");token=t;email=e==null?"":e;name=n==null?"":n;} public String getIdToken(){return token;} public String getEmail(){return email;} public String getDisplayName(){return name;} public String toString(){return "GoogleIdentity{token=[redacted], email=[redacted]}";} }
