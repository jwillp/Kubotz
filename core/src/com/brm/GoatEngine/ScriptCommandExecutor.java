package com.brm.GoatEngine;

import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.strongjoshua.console.CommandExecutor;

/**
 * Script Command Executor
 */
public class ScriptCommandExecutor extends CommandExecutor {







    // GAME SCREEN FUNCTIONS //


    /**
     * Pauses the game screen amanger
     */
    public void pauseGame(){
        GoatEngine.gameScreenManager.pause();
    }

    public void resumeGame(){
        GoatEngine.gameScreenManager.resume();
    }


    public void changeScreen(GameScreen screen){


        GoatEngine.gameScreenManager.changeScreen(screen);
    }











}
