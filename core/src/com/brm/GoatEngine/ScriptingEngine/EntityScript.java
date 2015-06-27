package com.brm.GoatEngine.ScriptingEngine;

import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.Kubotz.Common.Events.CollisionEvent;
import groovy.lang.Script;

import java.util.ArrayList;

/**
 * A Scrip to control entities and have unique behaviours.
 * This is the base class every Script derives from
 */
public abstract class EntityScript extends Script{

    private boolean isInitialized = false;

    /**
     * Called when a script is added to an entity
     */
    public void onInit(Entity entity, EntityManager entityManager){}


    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    public abstract void onUpdate(Entity entity, EntityManager entityManager);

    /**
     * Called when the entity this script is attached to presses one or more buttons
     * @param entity the entity this script is attached to
     * @param pressedButtons the buttons that were pressed
     */
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons){}


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     * @param entity
     */
    public void onCollision(CollisionEvent contact, Entity entity){}

    /**
     * When an entity event concerning the current entity occurs
     * @param event
     * @param entity
     * @param <T>
     */
    public <T extends EntityEvent> void onEvent(T event, Entity entity){}

    /**
     * when a global Event (concerning any entity) occurs
     * @param event
     * @param <T>
     */
    public <T extends GameEvent> void onGlobalEvent(T event){}


    /**
     * Called when the script is detached from the entity
     */
    public void onDetach(Entity entity){}


    public boolean isInitialized() {
        return isInitialized;
    }

    public void setInitialized(boolean isInitialized) {
        this.isInitialized = isInitialized;
    }


    public Object run(){
        return this;
    }
}
