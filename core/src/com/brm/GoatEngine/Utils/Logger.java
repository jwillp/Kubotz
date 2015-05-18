package com.brm.GoatEngine.Utils;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;

public class Logger {

    public static boolean IS_ENABLED = true;

    public static void log(Object message){
        if(IS_ENABLED){
            DateFormat df = new SimpleDateFormat("HH:mm:ss");
            String time = "["+df.format(Calendar.getInstance().getTime())+"] ";
            System.out.println(time + message);
        }

    }

}
