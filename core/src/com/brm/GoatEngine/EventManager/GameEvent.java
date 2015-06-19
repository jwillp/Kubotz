package com.brm.GoatEngine.EventManager;

/**
 * Base class for all events
 */
public abstract class GameEvent{

    public <T extends GameEvent> boolean isOfType(Class<T> type){
        return this.getClass() == type;
    }

}
