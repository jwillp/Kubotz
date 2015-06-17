package com.brm.GoatEngine.ScriptingEngine;

import com.brm.GoatEngine.GoatEngine;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Paths;

/**
 * Script engine used to communicate between the GameEngine and scripts
 */
public class ScriptingEngine {

    private Context context;
    private Scriptable scope;



    public ScriptingEngine(){}


    public void init(){
        context = Context.enter();
        context.setOptimizationLevel(-1);
        scope = context.initStandardObjects();



        //EXPOSE GOAT ENGINE API
        //Pass the engine to the current scope that way we have access to the whole engine (and game)
        addObjectToScope("GoatEngine", GoatEngine.get());

        //Put some helpers (Console for console.log, instead of doing GoatEngine.getConsole())
        addObjectToScope("console", GoatEngine.get().getConsole());

        //Event Manager

        //SCREEN MANAGER
        //add package
        this.addPackage("com.brm.GoatEngine.ScreenManager", "ScreenManagerPackage");

        // ECS






    }

    /**
     * Adds an object to the Script Engine's scope
     * Useful for game specific Script API
     * @param objectName
     * @param object
     * @param <T>
     */
    public <T extends Object> void addObjectToScope(String objectName, T object){
        scope.put(objectName, scope, Context.javaToJS(object, scope));
    }




    /**
     * Runs a script
     * @param script a script content as a String
     */
    public Object runScript(String script){
        return context.evaluateString(scope, script, script, 1, null);
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
     * Adds a Package to the scope
     */
    public void addPackage(String packageName, String accessName){
        this.runScript("var " +  accessName+ " = " + packageName);
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
