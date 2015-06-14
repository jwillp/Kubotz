package com.brm.GoatEngine.ECS.utils.Systems;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Events.CollisionEvent;
import sun.font.Script;
import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.Scriptable;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Scanner;


/**
 * Responsible for updateing sripts
 */
public class ScriptSystem extends EntitySystem {

    private Context context = Context.enter();
    private Scriptable scope;


    public ScriptSystem(){}


    @Override
    public void init() {
        Context ctx = Context.enter();
        ctx.setOptimizationLevel(-1);
        scope = ctx.initStandardObjects();

        String script = this.loadScript("scripts/ScriptSystemInit.js");

        Object wrappedOut = Context.javaToJS(new ScriptAPI(this), scope);
        scope.put("Engine", scope, wrappedOut);

        Object obj = ctx.evaluateString(scope, script, "MainScript", 1, null);
    }

    @Override
    public void handleInput() {
        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            if(entity.hasComponentEnabled(VirtualGamePad.ID)){
                handleInputForEntity(entity);
            }
        }
    }


    private void handleInputForEntity(Entity entity){
        ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        for(EntityScript script: scriptComp.getScripts()){
            if(!gamePad.getPressedButtons().isEmpty()){
                script.onInput(entity, gamePad.getPressedButtons());
                context.evaluateString(scope, "onInput();", "MainScript", 1, null);
            }
        }
    }

    @Override
    public void update(float dt) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(EntityScript script: scriptComp.getScripts()){

                //ON INIT
                if(!script.isInitialized()){
                    script.setSystem(this);
                    script.onInit(entity, getEntityManager());
                    script.setInitialized(true);
                }
                // ON UPDATE
                script.onUpdate(entity, getEntityManager());
                context.evaluateString(scope, "onUpdate();", "MainScript", 1, null);
            }
        }
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        Entity entity = getEntityManager().getEntity(event.getEntityId());
        if(entity.hasComponentEnabled(ScriptComponent.ID)){
            ScriptComponent scripts = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(EntityScript script: scripts.getScripts()){
                if(event.getClass() == CollisionEvent.class){
                    script.onCollision((CollisionEvent)event, entity); //TODO get rid of this! generify!
                    context.evaluateString(scope, "onCollision();", "MainScript", 1, null);
                }else{
                    script.onEvent(event, entity);
                    context.evaluateString(scope, "onEvent();", "MainScript", 1, null);
                }
            }
        }
    }




    public String loadScript(String scriptFile){
        try {
            byte[] encoded  = Files.readAllBytes(Paths.get(scriptFile));
            return new String(encoded, StandardCharsets.UTF_8);
        } catch (IOException e) {
            e.printStackTrace();
            throw new ScriptNotFoundException("SCRIPT NOT FOUND");
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
