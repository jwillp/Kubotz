package com.brm.GoatEngine;

import com.brm.Kubotz.GameScreens.TitleScreen;
import com.strongjoshua.console.CommandExecutor;

/**
 * Script Command Executor
 */
public class ScriptCommandExecutor extends CommandExecutor {







    // GAME SCREEN FUNCTIONS //


    /**
     * Pauses the game screen manager
     */
    public void pauseGame(){
        GoatEngine.gameScreenManager.pause();
    }

    public void resumeGame(){
        GoatEngine.gameScreenManager.resume();
    }


    public void changeScreen(String name){

        if(name.equals("title_screen")){
            GoatEngine.gameScreenManager.changeScreen(new TitleScreen());
        }

    }












}
