package com.brm.GoatEngine.ECS.Components;

import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;

/**
 * Used to store other entities as
 * children of the current entity. It is used to create a relationship
 * between a parent entities and multiple children entities
 * Useful for:
 *     - having different body parts
 *     - multiple guns on a spaceship
 *
 */
public class ChildrenComponent extends EntityComponent{

    public static final String ID = "CHILDREN_COMPONENT";

    private HashMap<String, Entity> children  = new HashMap<String, Entity>();

    /**
     * Adds a new Child to the children list
     * @param id an Identifier we want to associate the child with (ex legs, hair, head etc.)
     * @param child
     * @return this for chaining
     */
    public ChildrenComponent addChildren(String id, Entity child){
        this.children.put(id, child);
        return this;
    }

    /**
     * Returns a children associated to a certain key
     * @param id
     * @return
     */
    public Entity getChild(String id){
        return this.children.get(id);
    }

    /**
     * Removes a child from the children list associated with a certain id
     * @param id
     * @return this for chaining
     */
    public ChildrenComponent removeChild(String id){
        this.getChildren().remove(id);
        return this;
    }

    /**
     * Returns the children as a ArrayList
     * @return
     */
    public Collection<Entity> getChildren() {
        return children.values();
    }
}
