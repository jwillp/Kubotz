package com.brm.GoatEngine.ECS.Entity;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.Kubotz.Component.ControllableComponent;

import java.util.Hashtable;

public class Entity {

    protected String ID;
    protected EntityManager manager;


    public String getID() {
        return ID;
    }

    public void setID(String ID) {
        this.ID = ID;
    }

    public void setManager(EntityManager manager) {
        this.manager = manager;
    }

    // Wrapper methods //
    // TODO catch null pointer on manager meaning entity not registered
    /**
     * WRAPPER METHOD adds a component to the entity in the entity manager
     * @param cp
     * @param compId
     * @return
     */
    public Entity addComponent(Component cp, String compId) {
        manager.addComponent(compId, cp, getID());
        return this;
    }

    /**
     * WRAPPER METHOD Gets a component using its ID
     * @param componentId
     * @return
     */
    public Component getComponent(String componentId){
        return manager.getComponent(componentId, getID());
    }

    /**
     * WRAPPER METHOD Returns whether or not the entity has a certain Component
     * @param componentId
     * @return
     */
    public boolean hasComponent(String componentId){
        return  manager.hasComponent(componentId, getID());
    }


    /**
     * Enables a Component
     */
    public void enableComponent(String componentId){
        this.getComponent(componentId).setEnabled(true);
    }

    /**
     * Disables a Component
     */
    public void disableComponent(String componentId){
        this.getComponent(componentId).setEnabled(false);
    }



}

