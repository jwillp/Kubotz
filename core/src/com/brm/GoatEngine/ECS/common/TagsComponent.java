package com.brm.GoatEngine.ECS.common;

import com.brm.GoatEngine.ECS.core.EntityComponent;

import java.util.HashSet;

/**
 * Used to add tags to an entity
 */
public class TagsComponent extends EntityComponent {

    public static final String ID = "TAGS_COMPONENT";
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
