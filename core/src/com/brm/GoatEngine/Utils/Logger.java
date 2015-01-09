package com.brm.GoatEngine.Utils;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;

public class Logger {

    public static void log(Object message){
        DateFormat df = new SimpleDateFormat("HH:mm:ss");
        Calendar calobj = Calendar.getInstance();
        String time = "["+df.format(calobj.getTime())+"] ";
        System.out.println(time + message);
    }

}
