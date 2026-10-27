package com.sky.security;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** Salted PBKDF2 hashes for newly created course accounts; no legacy MD5 fallback. */
public final class PasswordHasher {
    private static final int ITERATIONS = 210000;
    private PasswordHasher() {}
    public static String hash(String password) {
        if (password == null || password.length() < 8 || password.length() > 128)
            throw new IllegalArgumentException("密码长度必须为8至128位");
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return "pbkdf2$" + ITERATIONS + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(derive(password,salt,ITERATIONS));
    }
    public static boolean matches(String password, String encoded) {
        if (password == null || password.length() > 128 || encoded == null) return false;
        try {
            String[] p = encoded.split("\\$");
            if (p.length != 4 || !"pbkdf2".equals(p[0])) return false;
            int iterations = Integer.parseInt(p[1]);
            if (iterations < 100000 || iterations > 1000000) return false;
            return MessageDigest.isEqual(Base64.getDecoder().decode(p[3]),derive(password,Base64.getDecoder().decode(p[2]),iterations));
        } catch (IllegalArgumentException e) { return false; }
    }
    private static byte[] derive(String password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(),salt,iterations,256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        catch (Exception e) { throw new IllegalStateException("Password hashing unavailable", e); }
        finally { spec.clearPassword(); }
    }
}
