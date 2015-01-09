package com.brm.GoatEngine.ECS.System;


import com.brm.GoatEngine.ECS.Entity.EntityManager;

public abstract class System {

    protected EntityManager em;


    public System(EntityManager em){
        this.em = em;
    }

    // Used to initialise the system
    public void init(){};

    // Called once per game frame
    public void update(float dt){};

}
