package com.brm.GoatEngine;

import com.brm.GoatEngine.ECS.utils.Systems.ScriptAPI;
import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.Scriptable;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Paths;

/**
 * Script engine used to communicate between the GameEngine and scripts
 */
public class GameScriptEngine{

    private Context context;
    private Scriptable scope;



    public GameScriptEngine(){
        context = Context.enter();
        context.setOptimizationLevel(-1);
        scope = context.initStandardObjects();

        String script = this.loadScript("scripts/ScriptSystemInit.js");

        context.evaluateString(scope, script, "MainScript", 1, null);
    }


    /**
     * Loads a script
     * @param scriptFile a script file path
     * @return the script as a string
     */
    public String loadScript(String scriptFile){
        byte[] encoded = null;
        try {
            encoded  = Files.readAllBytes(Paths.get(scriptFile));
        } catch(NoSuchFileException e){
            throw new ScriptNotFoundException(scriptFile);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return new String(encoded, StandardCharsets.UTF_8);
    }

    public void dispose() {
        this.context.exit();
    }

    /**
     * Exception for Script not found
     */
    public static class ScriptNotFoundException extends RuntimeException{

        public ScriptNotFoundException(String scriptName){
            super("The Script: " + scriptName + " was not found");
        }

    }









}
