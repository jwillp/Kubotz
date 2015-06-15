package com.brm.GoatEngine;

import com.brm.Kubotz.GameScreens.TitleScreen;
import com.strongjoshua.console.CommandExecutor;
import com.strongjoshua.console.Console;

/**
 * Script Command Executor
 */
public class ConsoleCommandeExecutor extends CommandExecutor {


    // SCRIPTING COMMANDS //

    /**
     * Loads a script file and runs it
     * @param scriptName the script file name
     */
    public void runScript(String scriptName){

        //Automatically add the extension
        if(!scriptName.endsWith(".js")){
            scriptName += ".js";
        }

        try{
            String script = GoatEngine.get().getScriptEngine().loadScript(scriptName);
            Object result = GoatEngine.get().getScriptEngine().runScript(script);
            GoatEngine.get().getConsole().log(result.toString(), Console.LogLevel.INFO);
        }catch(GameScriptEngine.ScriptNotFoundException e){
            GoatEngine.get().getConsole().log(e.getMessage(), Console.LogLevel.ERROR);
            runScript("scripts/"+scriptName); //Retry in the script folder
        }catch (Exception e){
            GoatEngine.get().getConsole().log(e.getMessage(), Console.LogLevel.ERROR);
        }

    }

    /**
     * Runs a Javascript code sample
     * @param javascript
     */
    public void js(String javascript){
        try{
            GoatEngine.get().getScriptEngine().runScript(javascript);
        }catch(Exception e){
            GoatEngine.get().getConsole().log(e.getMessage(), Console.LogLevel.ERROR);
        }
    }






    // GAME SCREEN COMMANDS //

    /**
     * Pauses the game screen manager
     */
    public void pauseGame(){
        GoatEngine.get().getGameScreenManager().pause();
    }

    public void resumeGame(){
        GoatEngine.get().getGameScreenManager().resume();
    }


    public void changeScreen(String name){

        if(name.equals("title_screen")){
            GoatEngine.get().getGameScreenManager().changeScreen(new TitleScreen());
        }

    }














}
