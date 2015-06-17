package com.brm.GoatEngine.EventManager;

/**
 * All classes that need to listen to GameEvents
 * should implement this interface
 */
public interface GameEventListener{

    public void onEvent(GameEvent e);


}
