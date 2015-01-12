package com.brm.GoatEngine.ECS.System;


import com.brm.GoatEngine.ECS.EntityManager;

public abstract class EntitySystem {

    protected EntityManager em;


    public EntitySystem(EntityManager em){
        this.em = em;
    }

    // Used to initialise the system
    public void init(){};

    // Called once per game frame
    public void update(float dt){};

}
