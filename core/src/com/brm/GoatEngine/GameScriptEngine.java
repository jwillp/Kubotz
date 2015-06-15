package com.brm.GoatEngine;

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

        //Pass the engine to the current scope that way we have access to the whole engine (and game)
        scope.put("GoatEngine", scope, Context.javaToJS(GoatEngine.get(), scope));
    }


    /**
     * Runs a script
     * @param script a script content as a String
     */
    public void runScript(String script){
        context.evaluateString(scope, script, script, 1, null);
    }


    /**
     * Loads a script as a string
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
        Context.exit();
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
