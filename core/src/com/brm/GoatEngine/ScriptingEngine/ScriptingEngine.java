package com.brm.GoatEngine.ScriptingEngine;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Utils.Logger;
import groovy.lang.Binding;
import groovy.util.GroovyScriptEngine;
import groovy.util.ResourceException;
import groovy.util.ScriptException;
import org.codehaus.groovy.control.CompilerConfiguration;
import org.codehaus.groovy.control.MultipleCompilationErrorsException;
import sun.rmi.runtime.Log;

import java.io.IOException;
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.HashMap;
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
    private HashMap<String, EntityScriptInfo> entityScripts = new HashMap<String, EntityScriptInfo>();

    // A list of scripts that ran with errors
    private ArrayList<String> errorScripts = new ArrayList<String>();


    private class EntityScriptInfo{

        private long lastModified = 0;
        private final HashMap<String, EntityScript> instances = new HashMap<String, EntityScript>();


        private EntityScriptInfo(long lastModified) {
            this.lastModified = lastModified;
        }

        /**
         * get the script instance for a certain entity Id
         * @param id
         * @return
         */
        public EntityScript getInstance(String id){
            return this.instances.get(id);
        }

        /**
         * Adds a new instance
         * @param entityId
         * @param instance
         */
        public void addInstance(String entityId, EntityScript instance){
            this.instances.put(entityId, instance);
        }

        /**
         * Gets the last time the script was modified
         * @return
         */
        public long getLastModified() {
            return lastModified;
        }

        /**
         * Sets the last time the script was modified
         * @param lastModified
         */
        public void setLastModified(long lastModified) {
            this.lastModified = lastModified;
        }

        public HashMap<String,EntityScript> getInstances() {
            return instances;
        }
    }




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
        config.setScriptBaseClass(EntityScript.class.getCanonicalName());

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


        Logger.info("Scripting Engine initialised");
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

        //If the script is not in memory, we'll "load" it
        if(!this.entityScripts.containsKey(scriptName)){
            this.entityScripts.put(scriptName, new EntityScriptInfo(this.getLastModified(scriptName)));
        }

        //Does the current entity has an instance of that script?
        if(this.entityScripts.get(scriptName).getInstance(entityObject.getID()) == null){
            Binding binding = this.copyBinding(globalScope);
            binding.setVariable("myEntityId", entityObject.getID());
            this.entityScripts.get(scriptName).addInstance(entityObject.getID(), groovyRunEntityScript(scriptName,binding));

        }

        //Does it need to be refreshed?
        if(this.isSourceNewer(scriptName)){
            this.entityScripts.get(scriptName).setLastModified(this.getLastModified(scriptName));
            this.refreshEntityScript(scriptName);
        }


        return this.entityScripts.get(scriptName).getInstance(entityObject.getID());
    }


    private EntityScript groovyRunEntityScript(String scriptName, Binding binding){
        try {
            return (EntityScript)engine.run(scriptName, binding);
        } catch (ResourceException e) {
            logError(scriptName, e.getMessage());
        } catch (ScriptException e) {
            logError(scriptName, e.getMessage());
        } catch (MultipleCompilationErrorsException e){
            logError(scriptName, e.getMessage());
        }
        return null;
    }


    public void logError(String scriptName, String message){
        if(!errorScripts.contains(scriptName)){
            Logger.error(message);
            errorScripts.add(scriptName);
        }
    }



    /**
     * Reloads an entity script for all concerned entities
     */
    public void refreshEntityScript(String scriptName) {
        EntityScriptInfo info = this.entityScripts.get(scriptName);
        for(Map.Entry<String, EntityScript> entry: info.getInstances().entrySet()){
            Binding binding = this.copyBinding(globalScope);
            binding.setVariable("entity", entry.getKey());
            entry.setValue(groovyRunEntityScript(scriptName, binding));
        }
        errorScripts.remove(scriptName);
    }


    /**
     * Returns whether a Script file was changed on disk but no in memory
     * @param scriptName the name of the script to test
     * @return
     */
    private boolean isSourceNewer(String scriptName){
        long fileTime = getLastModified(scriptName);
        long memoryTime = this.entityScripts.get(scriptName).getLastModified();
        return fileTime != memoryTime;
    }


    /**
     * Returns when a script was last modified
     * on disk (not in memory)
     * @return
     * @param scriptName
     */
    private long getLastModified(String scriptName){
        return Gdx.files.internal(SCRIPT_DIRECTORY+"/"+scriptName).lastModified();

    }



    /**
     * Returns a copy of the binding
     * @param binding
     * @return
     */
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
