package com.brm.GoatEngine.ECS.core.Entity;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;

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


    public Entity(){}

    public Entity(String id){
        this.setID(id);
    }



    // Wrapper methods //
    /**
     * WRAPPER METHOD adds a component to the entity in the entity manager
     * @param cp
     * @param compId
     * @return this for chaining
     */
    public Entity addComponent(EntityComponent cp, String compId){

        try{
            manager.addComponent(compId, cp, getID());
        } catch (NullPointerException e) {
            throw new UnregisteredEntityException();
        }
        return this;
    }

    /**
     * WRAPPER METHOD removes a component from an entity
     * @param componentId
     * @return this for chaining
     */
    public Entity removeComponent(String componentId){
        try {
            manager.removeComponent(componentId, getID());
        } catch (NullPointerException e) {
            throw new UnregisteredEntityException();
        }
        return this;
    }


    /**
     * WRAPPER METHOD Gets a component using its ID
     * @param componentId
     * @return
     */
    public EntityComponent getComponent(String componentId){
        try {
            EntityComponent component = manager.getComponent(componentId, getID());
            if(component == null)
                throw new EntityComponentNotFoundException(componentId);
            return component;
        } catch (NullPointerException e) {
            if(manager == null)
                throw new UnregisteredEntityException();
        }
        return null;
    }

    /**
     * WRAPPER METHOD Returns whether or not the entity has a certain Component
     * @param componentId
     * @return
     */
    public boolean hasComponent(String componentId){
        try {
            return  manager.hasComponent(componentId, getID());
        } catch (NullPointerException e) {
            throw new UnregisteredEntityException();
        }
    }

    /**
     * Returns if the entity has a certain Component and if that component is Enabled
     * If it does not have the component or that component is disabled returns false
     * otherwise true
     * @return
     */
    public boolean hasComponentEnabled(String componentId){
        if(hasComponent(componentId)){
            //it has the component, is it enabled?
            return getComponent(componentId).isEnabled();
        }
        return false;
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

    public EntityManager getManager() {
        return manager;
    }


    /**
     * Thrown when an unregistered entity tries to access a null EntityManager
     */
    public static class UnregisteredEntityException extends RuntimeException{
        public UnregisteredEntityException(){
            super("The Entity is not registered to any EntityManager");
        }
    }


    /**
     * Exception thrown when the game engine tries to use a component from an entity
     * that does not poses that particular component
     */
    public static class EntityComponentNotFoundException extends RuntimeException{

        //Constructor that accepts a message
        public EntityComponentNotFoundException(String componentName){
            super("The Component \"" + componentName + "\" was not found in Entity");
        }

    }

}

