package com.brm.GoatEngine.ScriptingEngine;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.EventManager.GameEventListener;
import com.brm.GoatEngine.GoatEngine;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;

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



    /**
     * This represents a script
     */
    public static class Script{
        private String source; //The source code of the script
        private Scriptable scope; //the scope of the script

        Script(String source, Scriptable scope){
            this.setSource(source);
            this.setScope(scope);
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public Scriptable getScope() {
            return scope;
        }

        public void setScope(Scriptable scope) {
            this.scope = scope;
        }
    }

    private Context context;
    private Scriptable globalScope; //The global scope for all scripts

    //A Hash containing a scope for every script run in by the engine
    //Where the key is the path of the script
    private HashMap<String, Script> scopeMap = new HashMap<String, Script>();

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

        context = Context.enter();
        context.setOptimizationLevel(-1);
        globalScope = context.initStandardObjects();


        //EXPOSE GOAT ENGINE API
        //Pass the engine to the current globalScope that way we have access to the whole engine (and game)
        addObjectToGlobalScope("GoatEngine", new GoatEngine()); //Dont mind the new we'll only access static methods

        //Put some helpers (Console for console.log, instead of doing GoatEngine.getConsole())
        addObjectToGlobalScope("console", GoatEngine.console);

        addObjectToGlobalScope("Gdx", new Gdx());



        //SCREEN MANAGER
        this.addPackageToGlobalScope("com.brm.GoatEngine.ScreenManager", "ScreenManagerPackage");

        this.addPackageToGlobalScope("com.brm.GoatEngine.EventManager", "EventManagerPacker");





    }


    /**
     * Adds an object to the Script Engine's globalScope
     * Useful for game specific Script API
     * @param objectName
     * @param object
     * @param <T>
     */
    public <T> void addObjectToGlobalScope(String objectName, T object){
        globalScope.put(objectName, globalScope, Context.javaToJS(object, globalScope));
    }

    /**
     * Adds a Package to the globalScope
     */
    public void addPackageToGlobalScope(String packageName, String accessName){
        this.runScript("var " +  accessName+ " = " + packageName, globalScope);
    }





    /**
     * Returns whether or not the script was registered to the engine with a scope
     * @param scriptPath the path of the script
     * @return
     */
    public boolean isScriptRegistered(String scriptPath){
        return this.scopeMap.containsKey(scriptPath);
    }

    /**
     * Reads a script's source from file
     * Creates a new scope for it
     * And registers it to the engine
     * @param scriptPath
     * @return the newly created script
     */
    public Script registerScript(String scriptPath){
        //Share the global scope to this new one
        Scriptable scriptScope = context.newObject(globalScope);
        scriptScope.setPrototype(globalScope);
        scriptScope.setParentScope(null);
        Script script = new Script(this.loadScript(scriptPath), scriptScope);
        this.scopeMap.put(scriptPath, script);
        return script;
    }


    /**
     * Runs a script from source in the global scope (by Default)
    * @param script a script content as a String
     */
    public Object runScriptInGlobalScope(String script) {
        return runScript(script, globalScope);
    }

    /**
     * Runs a script from a Script Object instance in the global scope
     * @param script
     * @return
     */
    public Object runScriptInGlobalScope(Script script){
        return this.runScriptInGlobalScope(script.getSource());
    }


    /**
     * Runs a script in its own scope
     * @param script
     * @return
     */
    public Object runScript(Script script){
        return this.runScript(script.getSource(), script.getScope());
    }



    /**
     * Runs a script from source in the specified scope
     * @param scriptSource a script content as a String
     */
    public Object runScript(String scriptSource, Scriptable scope){
        return context.evaluateString(scope, scriptSource, scriptSource, 1, null);
    }


    /**
     * Returns a script according to its name
     * @param scriptFileName
     * @return
     */
    public Script getScript(String scriptFileName){
        return this.scopeMap.get(scriptFileName);
    }
    

    
    /**
     * Loads a script as a string from it's source file
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

    /**
     * Reloads a script in memory
     * @param scriptFile
     * @return
     */
    public void reloadScript(String scriptFile){
        this.registerScript(scriptFile);
    }


    /**
     * Calls a function with certain parameters
     * @param scope
     * @param objects
     * @return
     */
    public Object callFunction( String functionName, Scriptable scope, Object... objects){
        Function function = (Function) scope.get(functionName, scope);
        return function.call(context, scope, scope, objects);
    }




    /**
     * Deinitialises the Script engine
     */
    public void dispose() {
        Context.exit();
    }


    @Override
    public void onEvent(GameEvent e) {
        if(e.isOfType(ReloadScriptEvent.class)){
            ReloadScriptEvent event = (ReloadScriptEvent) e;
            this.reloadScript(event.getScriptName());
        }
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
