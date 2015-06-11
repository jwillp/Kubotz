package com.brm.GoatEngine.ECS.utils.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;

import java.util.ArrayList;

/**
 * Enables entities to have Custom Behaviour using Scripts
 */
public class ScriptComponent extends EntityComponent {

    public static final String ID = "SCRIPT_COMPONENT";
    private ArrayList<EntityScript> scripts = new ArrayList<EntityScript>();

    private Entity entity = null; //The entity to which this component is attached

    public void addScript(EntityScript script){
        this.scripts.add(script);
    }


    public void removeScript(EntityScript script){
        script.onDetach(entity);
        this.scripts.remove(script);
    }


    public ArrayList<EntityScript> getScripts() {
        return scripts;
    }


    @Override
    public void onAttach(Entity entity) {
       this.entity = entity;
    }

    @Override
    public void onDetach(Entity entity) {
        this.entity = null;
    }


    /**
     * Exception thrown when we try to use the component when it was unattached to any entity
     */
    public static class UnattachedComponentException extends RuntimeException{
        //Constructor that accepts a message
        public UnattachedComponentException(String message){
            super(message);
        }
    }


}
