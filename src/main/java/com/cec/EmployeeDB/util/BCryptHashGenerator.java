package com.cec.EmployeeDB.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Small utility to generate bcrypt hashes from the command line.
 * Usage: java -cp target/classes;target/dependency/* com.cec.EmployeeDB.util.BCryptHashGenerator "PlainText1!"
 */
public class BCryptHashGenerator {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Usage: java com.cec.EmployeeDB.util.BCryptHashGenerator <password>");
            System.exit(2);
        }
        String pw = args[0];
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        String hash = enc.encode(pw);
        System.out.println(hash);
    }
}
