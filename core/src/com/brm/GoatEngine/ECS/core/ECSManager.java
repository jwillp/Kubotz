package com.brm.GoatEngine.ECS.core;

/**
 * Big container used to setup an ECS
 */
public class ECSManager {

    private EntityManager entityManager;
    private EntitySystemManager systemManager;

    public ECSManager(){

        entityManager = new EntityManager();
        systemManager = new EntitySystemManager(this);
    }


    public EntityManager getEntityManager() {
        return entityManager;
    }


    public EntitySystemManager getSystemManager() {
        return systemManager;
    }

}

