package com.brm.GoatEngine.ECS.Entity;

import com.brm.GoatEngine.ECS.Properties.Property;

import java.util.HashSet;
import java.util.Hashtable;

public class Entity {

    protected String ID;
    protected Hashtable<String, Property> properties = new  Hashtable<String, Property>();
    protected HashSet<String> tags = new HashSet<String>();



    /**
     * Returns whether or not the entity has a certain Property
     */
    public boolean hasProperty(String propertyName){
        return this.properties.containsKey(propertyName);
    }


    /**
     * Adds a new property
     * @param property
     * @return
     */
    public Entity addProperty(Property property, String propertyName){
        this.properties.put(propertyName, property);
        return this;
    }


    /**
     * Retrieve a property by its name
     * @param propertyName
     * @return
     */
    public Property getProperty(String propertyName){

        Property property = this.properties.get(propertyName);
        if(property != null)
            return property;
        else {
            throw new Property.EntityPropertyNotFoundException(propertyName);
        }

    }


    /**
     * Removes a property
     * @param propertyName
     */
    public void removeProperty(String propertyName){
        this.properties.remove(propertyName);

    }


    /**
     * Enables a property
     */
    public void enableProperty(String propertyName){
        this.properties.get(propertyName).setEnabled(true);
    }

    /**
     * Disables a property
     */
    public void disableProperty(String propertyName){
        this.properties.get(propertyName).setEnabled(false);
    }


    /**
     * Returns all the properties of the Entity
     * @return
     */
    public Hashtable<String, Property> getProperties() {
        return properties;
    }

    /**
     * Sets the properties of the entity
     * @param properties
     */
    public void setProperties(Hashtable<String, Property> properties) {
        this.properties = properties;
    }


    public String getID() {
        return ID;
    }

    public void setID(String ID) {
        this.ID = ID;
    }




    public void addTag(String tag){
        this.tags.add(tag);
    }

    public void removeTag(String tag){
        this.tags.remove(tag);
    }

    public boolean hasTag(String tag){
        return this.tags.contains(tag);
    }

    public HashSet<String> getTags() {
        return tags;
    }
}



