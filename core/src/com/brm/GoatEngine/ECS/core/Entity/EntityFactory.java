package com.brm.GoatEngine.ECS.core.Entity;

/**
 * Used to build an entity according to certain parameters
 */
public abstract class EntityFactory {


    protected EntityManager entityManager;

    public EntityFactory(EntityManager entityManager){
        this.entityManager = entityManager;
    }


    /**
     * Actually builds
     * @return a Registered entity object
     */
    public abstract Entity build();

}
