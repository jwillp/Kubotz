package com.brm.GoatEngine.ECS.Entity;

import java.util.ArrayList;
import java.util.UUID;


public class EntityManager {

    private ArrayList<Entity> entities = new  ArrayList<Entity>();

    public EntityManager(){}

    /**
     * Get a list of entities having a certain property
     * @param propertyName: ID of the property
     * @return
     */

    public ArrayList<Entity> getEntitiesWithProperty(String propertyName){
        ArrayList<Entity> entities = new ArrayList<Entity>();
        for(Entity entity : this.getEntities()){
            if(entity.hasProperty(propertyName)){
                entities.add(entity);
            }
        }
        return entities;
    }

    /**
     * Registers an Entity in the manager and gives it an ID
     * @param entity
     */
    public void registerEntity(Entity entity) {
        entity.setID(this.createID());
        this.getEntities().add(entity);
    }


    /**
     * Returns an Entity according to it's ID
     * @param ID
     */
    public Entity getEntity(String ID){
        for(Entity entity : this.getEntities()){
            if(entity.getID().equals(ID)){
                return entity;
            }
        }
        return null;
    }


    public ArrayList<Entity> getEntities() {
        return entities;
    }

    public void setEntities(ArrayList<Entity> entities) {
        this.entities = entities;
    }

    /**
     * Generates a unique ID
     */
    private String createID(){
        return UUID.randomUUID().toString();
    }


}
