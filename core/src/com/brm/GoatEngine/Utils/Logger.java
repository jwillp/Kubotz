package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.Gdx;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;

public class Logger {

    private static boolean printToScreen = true;

    private final static String LOG_FILE = "game.log";


    /**
     * Wrties the message with the time of display in a log file
     * and prints to the screen
     * @param message
     */
    private static void log(Object message){
        DateFormat df = new SimpleDateFormat("HH:mm:ss");
        String time = "["+df.format(Calendar.getInstance().getTime())+"] ";
        Gdx.files.local(LOG_FILE).writeString(time + message + "\n", true, StandardCharsets.UTF_8.toString());
        print(message);
    }

    /**
     * Prints in the program's console
     */
    private static void print(Object message){
        if(printToScreen){
            System.out.println(message);
        }
    }

    /**
     * Writes a regular status update message
     * @param message
     */
    public static void info(Object message){
        log("[INFO] " + message);
    }

    /**
     * Simply writes the message in the console screen
     * without loggin it. Useful to test values and debug things
     * @param message
     */
    public static void debug(Object message){
        print(message);
    }



    /**
     * Writes an important but not erroneous message
     * [WARNING]
     * @param message
     */
    public static void warn(Object message){
        log("[WARNING] " + message);
    }

    /**
     * Writes an erroneous message
     * [ERROR]
     * @param message
     */
    public static void error(Object message){
        log("[ERROR] " + message);
    }

    /**
     * Writes a fatal error message
     * [FATAL]
     * @param message
     */
    public static void fatal(Object message){
        log("[FATAL] " + message);
        //TODO display message box
    }


}
