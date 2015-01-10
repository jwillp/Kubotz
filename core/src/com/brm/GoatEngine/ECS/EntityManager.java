package com.brm.GoatEngine.ECS;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.*;

/**
 * Allows the retrieval of entities and their components
 */
public class EntityManager {

    private HashMap<String, HashMap<String, Component>> components = new HashMap<String, HashMap<String, Component>>();

    private ArrayList<Entity> entities = new  ArrayList<Entity>();

    public EntityManager(){

    }



    /**
     * Generates a unique ID for the entities
     */
    public String generateId(){
        return UUID.randomUUID().toString();
    }



    /**
     * Registers an Entity in the manager and gives it an ID
     * @param entity
     * @return returns the id of the newly registered entity
     */
    public String registerEntity(Entity entity) {
        entity.setID(generateId());
        entity.setManager(this);
        return entity.getID();
    }



    /**
     *  Adds a Property to an Entity
     * @param componentId: The Id of the component to add
     * @param component: The instance of the component to add
     * @param entityId: The Id of the entity
     * @return EntityManager for chaining
     */
    public EntityManager addComponent(String componentId, Component component, String entityId){

        HashMap componentContainer = this.components.get(componentId);
        if(componentContainer == null){
            componentContainer = new HashMap<String, Component>();
        }
        componentContainer.put(entityId, component);
        this.components.put(componentId, componentContainer);

        return this;
    }

    /**
     * Returns the component instance of a certain type belonging to an entity
     * @param componentId: the Id of the component to retrieve
     * @param entityId: The id of the entity of which we want the component
     * @return Component: The desired component instance
     */
    public Component getComponent(String componentId, String entityId){
        Component component;

        HashMap<String, Component> componentEntry = this.components.get(componentId);

        component = componentEntry.get(entityId);
        return component;
    }

    /**
     * Returns all the components of a certain entity
     * @param entityId
     * @return
     */
    public HashMap<String, Component> getEntityComponents(String entityId){
        HashMap<String, Component> components = new HashMap<String, Component>();
        for(String compId: this.components.keySet()){
            if(this.components.get(compId).containsKey(entityId)){
                components.put(compId, this.components.get(compId).get(entityId));
            }
        }
        return components;
    }



    /**
     * Returns whether or not an entity has a certain component
     * @param componentId the id of the component
     * @param entityId the Id of the entity
     * @return
     */
    public boolean hasComponent(String componentId, String entityId) {
        return this.components.containsKey(componentId) && this.components.get(componentId).containsKey(entityId);
    }

    /**
     * Get a list of entities having a certain property
     * @param componentId : ID of the property
     * @return as ArrayList of Entities object
     */

    public ArrayList<Entity> getEntitiesWithComponent(String componentId){
        ArrayList<Entity> entities = new ArrayList<Entity>();
        for(String enId : this.components.get(componentId).keySet()){
            entities.add(getEntity(enId));
        }
        return entities;
    }



    /**
     * Removes all references to a certain entity
     * @param entityId
     */
    public void deleteEntity(String entityId){
        for(String compId: this.components.keySet()){
            this.components.get(compId).remove(entityId);
        }
    }

    /**
     * Returns an entity object with Id
     * @param entityId
     * @return
     */
    public Entity getEntity(String entityId){
        Entity e = new Entity();
        e.setID(entityId);
        e.setManager(this);
        return e;
    }



}
