package com.brm.GoatEngine.Input;

import com.badlogic.gdx.InputProcessor;
import com.brm.GoatEngine.Input.GameControllerManager;
import com.brm.GoatEngine.Input.KeyboardInputManager;

/**
 * Global input manager
 */
public class InputManager{

    private final GameControllerManager gameControllerManager;

    private final KeyboardInputManager keyboardInputManager;

    public InputManager(){
            gameControllerManager = new GameControllerManager(this);
            keyboardInputManager = new KeyboardInputManager(this);
    }


    public GameControllerManager getGameControllerManager() {
        return gameControllerManager;
    }

    public KeyboardInputManager getKeyboardInputManager() {
        return keyboardInputManager;
    }
}
