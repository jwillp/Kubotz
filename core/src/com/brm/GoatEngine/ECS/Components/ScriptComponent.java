package com.brm.GoatEngine.ECS.Components;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;

import java.util.ArrayList;

/**
 * Enables entities to have Custom Behaviour using Scripts
 */
public class ScriptComponent extends EntityComponent {

    public static final String ID = "SCRIPT_COMPONENT";
    private ArrayList<EntityScript> scripts = new ArrayList<EntityScript>();




    public void addScript(EntityScript script, Entity entity, EntityManager manager){
        script.onInit(entity, manager);
        this.scripts.add(script);
    }


    public void removeScript(EntityScript script, Entity entity, EntityManager manager){
        script.onDetach(entity, manager);
        this.scripts.remove(script);
    }


    public ArrayList<EntityScript> getScripts() {
        return scripts;
    }








}
