package com.brm.GoatEngine.ECS.System;

import com.badlogic.gdx.Gdx;

import java.util.LinkedHashMap;

/**
 * A Class Managing multiple managers
 * This way any System could access another System's data
 */
public class EntitySystemManager {

    private LinkedHashMap<Class, EntitySystem> systems;


    public EntitySystemManager(){
        systems = new LinkedHashMap<Class, EntitySystem>();
    }

    /**
     * Returns a System
     * @param systemType
     * @param <T>
     * @return
     */
    public <T extends EntitySystem> T getSystem(Class<T> systemType){
        return (T)this.systems.get(systemType);
    }

    /**
     * Adds a System to the list of systems THE ORDER IS IMPORTANT
     * @param systemType
     * @param system
     * @param <T>
     */
    public <T extends  EntitySystem> void addSystem(Class<T> systemType, EntitySystem system){
        system.setSystemManager(this);
        this.systems.put(systemType, system);
    }


    /**
     * Inits all systems in order
     */
    public void initSystems(){
        for(EntitySystem system: systems.values()){
            system.init();
        }
    }


    /**
     * Deinits all systems in order
     */
    public void deInitSystems(){
        for(EntitySystem system: systems.values()){
            system.deInit();
        }
    }



    /**
     *  Handles the input for all systems in order
     */
    public void handleInput(){
        for(EntitySystem system: systems.values()){
            system.handleInput();
        }
    }



    /**
     * Updates all systems in order
     */
    public void update(){
        for(EntitySystem system: systems.values()){
            system.update(Gdx.graphics.getDeltaTime());
        }
    }


    /**
     * Renders all systems in order
     */
    public void render(){
        for(EntitySystem system: systems.values()){
            system.render(Gdx.graphics.getDeltaTime());
        }
    }

}
