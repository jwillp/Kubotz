package com.brm.GoatEngine.Konsole;

import com.brm.GoatEngine.ScriptingEngine.ScriptingEngine;
import com.brm.GoatEngine.GoatEngine;
import com.brm.Kubotz.GameScreens.TitleScreen;
import com.strongjoshua.console.CommandExecutor;
import com.strongjoshua.console.Console;

import java.util.Arrays;

/**
 * Script Command Executor specific to the GoatEngine
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

        //runScript("scripts/"+scriptName); //Retry in the script folder

        try{ //TODO see if we run this in the Gobal or register it
            String script = GoatEngine.scriptEngine.loadScript(scriptName);
            GoatEngine.scriptEngine.runScriptInGlobalScope(script);
        }catch(ScriptingEngine.ScriptNotFoundException e){
            GoatEngine.console.log(e.getMessage(), Console.LogLevel.ERROR);
        }catch (Exception e){
            GoatEngine.console.log(e.getMessage(), Console.LogLevel.ERROR);
        }

    }

    public void reloadScript(String scriptFileName){
        try{
            GoatEngine.scriptEngine.reloadScript(scriptFileName);
        }catch(Exception e){
            console.log(e.getMessage(), Console.LogLevel.ERROR);
        }

    }


    /**
     * Runs a Javascript code sample
     * @param javascript
     */
    public void js(String... javascript){
        String source = Arrays.toString(javascript);
        try{
            Object result = GoatEngine.scriptEngine.runScriptInGlobalScope(source);
            GoatEngine.console.log(">>> " + result.toString(), Console.LogLevel.INFO);
        }catch(Exception e){
            GoatEngine.console.log(e.getMessage(), Console.LogLevel.ERROR);
        }
    }







    // GAME SCREEN COMMANDS //

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
