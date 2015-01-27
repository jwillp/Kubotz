package com.brm.GoatEngine.Utils;


public class Timer {
    public static final int INFINITE = -35; //To put the timer to be infinite and never be done

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
        return (delay != INFINITE) && ((System.currentTimeMillis() - this.lastCheck) >= this.delay);
    }

    /**
     * Forces the timer to be done, after that method call
     * the timer will ineitably be done
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


    /**
     * Exceptions related to Timer Misuse
     */
    public class TimerException extends RuntimeException{
        public TimerException(String message){
            super(message);
        }
    }





}

