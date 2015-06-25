package com.brm.GoatEngine.ScriptingEngine;

import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Utils.Logger;
import groovy.lang.Binding;
import groovy.util.GroovyScriptEngine;
import groovy.util.ResourceException;
import groovy.util.ScriptException;
import org.codehaus.groovy.control.CompilerConfiguration;
import org.codehaus.groovy.control.MultipleCompilationErrorsException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Script engine used to communicate between the GameEngine and scripts
 */
public class ScriptingEngine{

    public final static String SCRIPT_DIRECTORY = "scripts";

    private GroovyScriptEngine engine;
    private Binding globalScope;


    //A Hash containing a the source for every script run in by the engine
    //Where the key is the path of the script
    private HashMap<String, String> scripts = new HashMap<String, String>();

    /**
     * Default ctor
     */
    public ScriptingEngine(){}


    /**
     * Initialises the Script Engine
     * By creating the environment (Context)
     * And exposing the basic Game Engine API
     */
    public void init(){

        // Init the script engine interpreter
        CompilerConfiguration config = new CompilerConfiguration();
        config.setScriptBaseClass("com.brm.GoatEngine.ScriptingEngine.EntityScript");

        try {
            engine = new GroovyScriptEngine(SCRIPT_DIRECTORY, this.getClass().getClassLoader());
            engine.setConfig(config);
        } catch (IOException e) {
            e.printStackTrace();
        }

        globalScope = new Binding();


        //EXPOSE GOAT ENGINE API
        //Pass the engine to the current globalScope that way we have access to the whole engine (and game)
        addObject("GoatEngine", new GoatEngine()); //Dont mind the new we'll only access static methods

        //Put some helpers
        addObject("console", GoatEngine.console); //Console for console.log, instead of doing GoatEngine.getConsole()
        addObject("EventManager", GoatEngine.eventManager);



    }



    /**
     * Adds an object to the Script Engine's global context
     * Useful for game specific Script API
     * @param objectName
     * @param object
     * @param <T>
     */
    public <T> void addObject(String objectName, T object){
        this.globalScope.setVariable(objectName, object);
    }


    /**
     * Runs a script according to its name
     * @param scriptName
     * @return
     */
    public Object runScript(String scriptName){
        Object result = null;
        try {
            result = this.engine.run(scriptName, globalScope);
        } catch (ResourceException e) {
            e.printStackTrace();
            throw new ScriptNotFoundException(scriptName);
        } catch (ScriptException e) {
            e.printStackTrace();
        }
        return result;
    }

    /**
     * Runs a script using it's source code as a string
     * @param source
     * @return
     */
    public Object runScriptSource(String source) {
        try {
            return this.engine.run(source, this.globalScope);
        } catch (ResourceException e) {
            e.printStackTrace();
        } catch (ScriptException e) {
            e.printStackTrace();
        }
        return null;
    }


    /**
     * Runs an Entity Script
     * @param scriptName
     * @return
     */
    public EntityScript runEntityScript(String scriptName, Entity entityObject){
        EntityScript script = null;
        Binding binding = this.copyBinding(globalScope);
        binding.setVariable("entity", entityObject);
        Logger.log(scriptName);

        try {
            script = (EntityScript) engine.run(scriptName, binding);
        } catch (ResourceException e) {
            e.printStackTrace();
        } catch (ScriptException e) {
            e.printStackTrace();
        }

        return script;
    }



    private Binding copyBinding(Binding binding){
        return new Binding(binding.getVariables());
    }






    public void dispose() { }


    /**
     * Exception for Script not found
     */
    public static class ScriptNotFoundException extends RuntimeException{

        public ScriptNotFoundException(String scriptName){
            super("The Script: " + scriptName + " was not found");
        }

    }

}
