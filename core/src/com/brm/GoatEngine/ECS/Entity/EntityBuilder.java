package com.brm.GoatEngine.ECS.Entity;

import com.brm.GoatEngine.ECS.EntityManager;

/**
 * Used to build an entity according to certain parameters
 */
public abstract class EntityBuilder {


    protected EntityManager entityManager;

    public EntityBuilder(EntityManager entityManager){
        this.entityManager = entityManager;
    }


    /**
     * Actually builds
     * @return a Registered entity object
     */
    public abstract Entity build();

}
