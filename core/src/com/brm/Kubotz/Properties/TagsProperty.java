package com.brm.Kubotz.Properties;

import com.brm.GoatEngine.ECS.Properties.Property;

import java.util.HashSet;

/**
 * Used to add tags to an entity
 */
public class TagsProperty extends Property {

    private HashSet<String> tags = new HashSet<String>();

    /**
     * Adds a new tag to an entity
     * @param tag
     */
    public void addTag(String tag){
        this.tags.add(tag);
    }

    /**
     * Removes a tag from the entity
     * @param tag
     */
    public void removeTag(String tag){
        this.tags.remove(tag);
    }

    /**
     * Returns whether or not the entity has a certain tag
     * @param tag
     * @return
     */
    public boolean hasTag(String tag){
        return this.tags.contains(tag);
    }

    /**
     * Returnas all the tags of the entity
     * @return
     */
    public HashSet<String> getTags() {
        return tags;
    }

}
