package com.brm.GoatEngine.ECS.Entity;

import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;


import java.util.*;

/**
 * Allows the retrieval of entities and their components
 */
public class EntityManager {

    //HashMap<COMPONENT_ID, HashMap<ENTITY_ID, COMPONENT_ISNTANCE>>
    private HashMap<String, HashMap<String, EntityComponent>> components = new HashMap<String, HashMap<String, EntityComponent>>();

    public EntityManager(){}



    /**
     * Generates a unique ID for the entities
     */
    public String generateId(){
        return UUID.randomUUID().toString();
    }



    /**
     * Registers an Entity in the manager and gives it an ID
     * @param entity the entity to register
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
    public EntityManager addComponent(String componentId, EntityComponent component, String entityId){

        HashMap componentContainer = this.components.get(componentId);
        if(componentContainer == null){
            componentContainer = new HashMap<String, EntityComponent>();
        }
        componentContainer.put(entityId, component);
        this.components.put(componentId, componentContainer);

        //Call on attach
        component.onAttach();
        return this;
    }

    /**
     * Removes a component from an entity
     * @param componentId the id of the component
     * @param entityId the id of the entity
     * @return this for chaining
     */
    public EntityManager removeComponent(String componentId, String entityId){
        HashMap<String, EntityComponent> componentEntry = this.components.get(componentId);

        //Test if the entity has the component
        if(this.hasComponent(componentId, entityId)) {
            //Call onDetach
            componentEntry.get(entityId).onDetach();
            componentEntry.remove(entityId);
        }
        return this;
    }



    /**
     * Returns the component instance of a certain component type belonging to an entity
     * @param componentId: the Id of the component to retrieve
     * @param entityId: The id of the entity of which we want the component
     * @return Component: The desired component instance
     */
    public EntityComponent getComponent(String componentId, String entityId){
        EntityComponent component;

        HashMap<String, EntityComponent> componentEntry = this.components.get(componentId);

        component = componentEntry.get(entityId);
        return component;
    }

    /**
     * Returns all the components of a certain entity
     * @param entityId : the id of the entity
     * @return a list of components
     */
    public HashMap<String, EntityComponent> getComponentsForEntity(String entityId){
        HashMap<String, EntityComponent> components = new HashMap<String, EntityComponent>();
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
     * @return the component
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
        if(this.components.containsKey(componentId)){
            for(String enId : this.components.get(componentId).keySet()){
                entities.add(getEntity(enId));
            }
        }
        return entities;
    }

    /**
     * Returns all the entities having a certain component and having that component enabled
     * @param componentId
     * @return
     */
    public ArrayList<Entity> getEntitiesWithComponentEnabled(String componentId){
        ArrayList<Entity> entities = new ArrayList<Entity>();
        if(this.components.containsKey(componentId)){
            for(String enId : this.components.get(componentId).keySet()){
                if(this.components.get(componentId).get(enId).isEnabled()){
                    entities.add(getEntity(enId));
                }
            }
        }
        return entities;
    }




    public ArrayList<Entity> getEntitiesWithTag(String tag){
        ArrayList<Entity> entitiesWithTag = new ArrayList<Entity>();
        for(Entity e: getEntitiesWithComponent(TagsComponent.ID)){
            if(((TagsComponent)e.getComponent(TagsComponent.ID)).hasTag(tag)){
                entitiesWithTag.add(e);
            }
        }
        return entitiesWithTag;
    }

    /**
     * Returns all the components instance of a certain type along with the Id of the entity
     * in the form of a HashMap
     * @param compId: the Id of the component
     * @return HashMap<String, Component>
     */
    public HashMap<String, EntityComponent> getComponentsWithEntity(String compId){
        return this.components.get(compId);
    }







    /**
     * Removes all references to a certain entity
     * @param entityId
     */
    public void deleteEntity(String entityId){
        for(String compId: this.components.keySet()){
            this.removeComponent(compId, entityId);
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


    /**
     * Returns all entities
     * @return
     */
    public HashSet<Entity> getEntities(){
        HashSet<Entity> entities = new HashSet<Entity>();
        for(String compId: this.components.keySet()){
            entities.addAll(this.getEntitiesWithComponent(compId));
        }

        return entities;
    }

    /**
     * Returns all the components instance of a certain type
     * @param compId: the Id of the component
     * @return ArrayList of Components or an empty array list if no instance of component type exist.
     */
    public ArrayList<EntityComponent> getComponents(String compId){

        if(this.components.containsKey(compId)){
            return new ArrayList<EntityComponent>(this.components.get(compId).values());
        }else{
            return new ArrayList<EntityComponent>(); //Empty ArrayList
        }

    }


    /**
     * Returns the number of entities
     * @return
     */
    public int getEntityCount(){
        return this.getEntities().size();
    }


    /**
     * Deletes all the entities
     */
    public void clear(){
        for(Entity e: this.getEntities()){
            this.deleteEntity(e.getID());
        }
    }


}
