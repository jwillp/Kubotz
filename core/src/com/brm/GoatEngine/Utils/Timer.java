package com.brm.GoatEngine.Utils;


import java.util.concurrent.TimeUnit;

public class Timer {
    public static final int INFINITE = Integer.MAX_VALUE; //To put the timer to be infinite and never be done
    public static final int ONE_SECOND = 1000;
    public static final int HALF_A_SECOND = ONE_SECOND/2;
    public static final int THIRD_OF_A_SECOND = ONE_SECOND/2;

    public static final int THREE_SECONDS = ONE_SECOND*3;
    public static final int FIVE_SECONDS = ONE_SECOND*5;
    public static final int TEN_SECONDS = ONE_SECOND*10;

    public static final int ONE_MINUTE = ONE_SECOND*60;


    /**
     * Returns the number of milliseconds for a certain number of seconds
     * @param number the number of seconds desired
     * @return
     */
    public static int nbSeconds(float number){
        return (int) (number * 1000);
    }




    private int delay; // in milliseconds so 60 means 60 milliseconds
    private long startTime = -1;
    private long lastCheck = -1;

    public Timer(int delayInMs){
        this.delay = delayInMs;
    }

    public void start(){
        this.startTime = System.currentTimeMillis();
        this.lastCheck = startTime;
    }


    public boolean isDone() {
        if (startTime == -1 || lastCheck == -1) {
            throw new TimerException("The Timer was not started, call function start() before using Timer");
        }
        return System.currentTimeMillis() - this.lastCheck >= this.delay;
    }

    /**
     * Forces the timer to be done, after that method call
     * the timer will inevitably be done
     */
    public void terminate(){
        this.lastCheck = 0;
    }


    /**
     * Returns the time in seconds since the beginning of the timer
     * i.e. since the call to the start function
     * @return
     */
    public int getRunningTime(){
        return (int)(System.currentTimeMillis() - startTime);
    }

    public void reset(){
        this.lastCheck = System.currentTimeMillis();
    }

    /**
     * Returns the delta time (current time since last check)
     * @return
     */
    public long getDeltaTime(){
            return System.currentTimeMillis() - lastCheck;
    }

    public int getDelay() {
        return delay;
    }

    public void setDelay(int newDelay){ delay = newDelay; }

    /**
     * Exceptions related to Timer Misuse
     */
    public class TimerException extends RuntimeException{
        public TimerException(String message){
            super(message);
        }
    }

    /**
     * Converts a number of milliseconds to a formated string
     * mm:ss
     */
    public static String toStringMinSec(int milliseconds){
        return String.format("%d:%d",
                TimeUnit.MILLISECONDS.toMinutes(milliseconds),
                TimeUnit.MILLISECONDS.toSeconds(milliseconds) -
                        TimeUnit.MINUTES.toSeconds(TimeUnit.MILLISECONDS.toMinutes(milliseconds))
        );
    }


    /**
     * Converts milliseconds to a number of seconds
     * @param ms nbMilliseconds to convert
     * @return
     */
    public static int msToSeconds(int ms){
        return (ms/1000) % 60;
    }

    /**
     * Converts milliseconds to a number of minutes
     * @param ms nbMilliseconds to convert
     * @return
     */
    public static int msToMinutes(int ms){
        return (ms/1000*60) % 60;
    }


    /**
     * Converts milliseconds to a number of hours
     * @param ms nbMilliseconds to convert
     * @return
     */
    public static int msToHours(int ms){
        return (ms/1000*60*60) % 24;
    }

}

