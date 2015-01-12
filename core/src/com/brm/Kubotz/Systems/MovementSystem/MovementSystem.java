package com.brm.Kubotz.Systems.MovementSystem;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;

/**
 * System handling the controllable Entities such as most characters
 */
public class MovementSystem extends EntitySystem {

    FlySystem flySystem;
    WalkingSystem walkingSystem;



    public MovementSystem(EntityManager em) {
        super(em);
        flySystem = new FlySystem(em);
        walkingSystem = new WalkingSystem(em);
    }


    public void handleInput(){
        for(Entity entity: em.getEntitiesWithComponent(VirtualGamePad.ID)){
            walkingSystem.handleInput(entity);
            flySystem.handleInput(entity);
        }

    }



    public void update(){
        flySystem.update();
        walkingSystem.update();

    }















}
