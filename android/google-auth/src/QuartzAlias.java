package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class QuartzAlias { private final String email; public QuartzAlias(String v){if(v==null||!v.matches("[a-z0-9._-]{1,24}@quartz\\.com"))throw new IllegalArgumentException("invalid alias");email=v;} public String getEmail(){return email;} public boolean isMailbox(){return false;} }
