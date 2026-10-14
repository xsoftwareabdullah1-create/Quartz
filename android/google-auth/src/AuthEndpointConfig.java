package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class AuthEndpointConfig { private final String base; public AuthEndpointConfig(String v){if(v==null||!v.startsWith("https://"))throw new IllegalArgumentException("HTTPS required");base=v.replaceAll("/+$","");} public String healthUrl(){return base+"/health";} }
