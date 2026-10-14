package dev.quartz.search.googleauth;

/** Quartz Google identity integration helper; backend verification is mandatory. */
public final class AuthInputValidator { private AuthInputValidator(){} public static boolean emailShape(String v){return v!=null&&v.length()<=254&&v.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");} public static boolean tokenPresent(String v){return v!=null&&!v.trim().isEmpty();} }
