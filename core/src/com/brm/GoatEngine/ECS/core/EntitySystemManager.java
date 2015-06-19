package com.brm.GoatEngine.ECS.core;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.EventManager.GameEventListener;
import com.brm.GoatEngine.GoatEngine;

import java.util.LinkedHashMap;

/**
 * A Class Managing multiple managers
 * This way any System could access another System's data
 */
public class EntitySystemManager implements GameEventListener{

    private ECSManager ecsManager;
    private LinkedHashMap<Class, EntitySystem> systems;


    public EntitySystemManager(ECSManager manager){
        ecsManager = manager;
        systems = new LinkedHashMap<Class, EntitySystem>();
        GoatEngine.get().getEventManager().addListener(this);

    }

    /**
     * Returns a System
     * @param systemType
     * @param <T>
     * @return
     */
    @SuppressWarnings("unchecked")
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
        system.setEntityManager(this.ecsManager.getEntityManager());
        this.systems.put(systemType, system);
    }


    /**
     * Inits all systems in order
     */
    public void initSystems(){
        for (Object system : systems.values().toArray()) {
            ((EntitySystem)system).init();
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
     * Fires an event to all Systems
     * @param event
     */
    public <T extends EntityEvent> void fireEvent(T event) {
        GoatEngine.get().getEventManager().fireEvent(event);
    }

    @Override
    public void onEvent(GameEvent e) {
        for(EntitySystem system: this.systems.values()){
            system.onEvent((EntityEvent)e);
        }
    }


}
