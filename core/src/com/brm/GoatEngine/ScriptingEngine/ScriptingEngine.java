package com.brm.GoatEngine.ScriptingEngine;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.EventManager.GameEventListener;
import com.brm.GoatEngine.GoatEngine;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import org.codehaus.groovy.control.CompilerConfiguration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Paths;
import java.util.HashMap;

/**
 * Script engine used to communicate between the GameEngine and scripts
 */
public class ScriptingEngine implements GameEventListener{


    private GroovyShell shell;

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
        GoatEngine.eventManager.addListener(this);

        // Init the Shell
        CompilerConfiguration config = new CompilerConfiguration();
        config.setScriptBaseClass("com.brm.GoatEngine.ScriptEngine.GameScript");

        shell = new GroovyShell(this.getClass().getClassLoader(), new Binding(), config);
        shell = new GroovyShell(this.getClass().getClassLoader(), new Binding());



        //EXPOSE GOAT ENGINE API
        //Pass the engine to the current globalScope that way we have access to the whole engine (and game)
        addObject("GoatEngine", new GoatEngine()); //Dont mind the new we'll only access static methods

        //Put some helpers (Console for console.log, instead of doing GoatEngine.getConsole())
        addObject("console", GoatEngine.console);

        addObject("Gdx", new Gdx());



    }


    /**
     * Adds an object to the Script Engine's global context
     * Useful for game specific Script API
     * @param objectName
     * @param object
     * @param <T>
     */
    public <T> void addObject(String objectName, T object){
        shell.setVariable(objectName, object);
    }



    /**
     * Runs a script from source
     * @param scriptName a script content as a String
     */
    public Object runScript(String scriptName){

        if(!this.scripts.containsKey(scriptName)){
            String source = this.loadScript(scriptName);
            this.scripts.put(scriptName, source);
        }

        groovy.lang.Script s = shell.parse(this.scripts.get(scriptName));
        return s.run();
    }



    
    /**
     * Loads a the script as a string from it's source file
     * @param scriptFile a script file path
     * @return the script's source code as a string
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
        assert encoded != null;
        return new String(encoded, StandardCharsets.UTF_8);
    }



    /**
     * Reloads a script in memory
     * @param scriptFile
     * @return
     */
    public void reloadScript(String scriptFile){
        String newSource = this.loadScript(scriptFile);
        this.scripts.put(scriptFile, newSource);
        //TODO Trigger event Script Reloaded?
    }



    @Override
    public void onEvent(GameEvent e) {
        if(e.isOfType(ReloadScriptEvent.class)){
            ReloadScriptEvent event = (ReloadScriptEvent) e;
            this.reloadScript(event.getScriptName());
        }
    }

    public void dispose() {
    }

    public Object runScriptSource(String source) {
        return this.shell.evaluate(source);
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
