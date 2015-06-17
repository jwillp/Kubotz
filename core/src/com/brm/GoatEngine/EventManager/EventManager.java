package com.brm.GoatEngine.EventManager;

import java.util.ArrayList;
import java.util.LinkedHashMap;

/**
 * Manages Game Events and the listeners
 */
public class EventManager{

    LinkedHashMap<Long, GameEvent> events = new LinkedHashMap<Long, GameEvent>();
    ArrayList<GameEventListener> listeners = new ArrayList<GameEventListener>();

    public EventManager() {


    }

    public void addListener(GameEventListener listener){
        this.listeners.add(listener);
    }


    /**
     * Fires an event to all the listeners
     * @param e
     */
    public void fireEvent(GameEvent e){
        this.events.put(getCurrentTime(), e);
        for(GameEventListener listener: this.listeners){
            listener.onEvent(e);
        }
    }



    /**
     * Returns the current time
     */
    private long getCurrentTime(){
        return System.currentTimeMillis();
    }


}
