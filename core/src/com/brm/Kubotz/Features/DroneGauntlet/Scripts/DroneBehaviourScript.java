package com.brm.Kubotz.Features.DroneGauntlet.Scripts;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.GoatEngine.AI.Components.AIComponent;
import com.brm.Kubotz.Events.CollisionEvent;

import java.util.ArrayList;


/**
 * AI Behaviour for Drones
 * No behaviour tree. (Overkill)
 */
public class DroneBehaviourScript extends EntityScript {

    @Override
    public void onUpdate(Entity entity, EntityManager manager) {

        PhysicsComponent dronePhys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        AIComponent aiComponent = (AIComponent)entity.getComponent(AIComponent.ID);

        Entity master = manager.getEntity((String)aiComponent.getBlackboard().get("master"));
        PhysicsComponent masterPhys = (PhysicsComponent) master.getComponent(PhysicsComponent.ID);



        // Find closest enemy to the Master within a radius
        //SensorComponent sensor = (SensorComponent) master.getComponent(SensorComponent.ID);
        //this.identifyThreat(sensor.getDetectedEntities(), entity.getID(), aiComponent);


        // Move closer to that enemy (if any)
        if(aiComponent.getBlackboard().containsKey("threat")){
            PhysicsComponent threatPhys = (PhysicsComponent) manager.getComponent(
                    PhysicsComponent.ID,
                    (String) aiComponent.getBlackboard().get("threat")
            );
            this.moveToDestination(dronePhys, threatPhys.getPosition());

            //Shoot (Make sure at the moment of shooting the bullet wont hurt the player)



        }else{
            //if no enemy in sight follow player
            this.moveToDestination(dronePhys, masterPhys.getPosition());
        }




    }


    @Override
    public void onCollision(CollisionEvent contact) {

    }

    /**
     * Identifies a threat
     */
    private void identifyThreat(ArrayList<String> potentielThreats, String droneId, AIComponent aiComponent){

        if(potentielThreats.isEmpty()){
            return; // No threat in sight
        }

        //TODO Check Teams Instead
        String threat = potentielThreats.get(0);
        if(threat.equals(droneId)){
            return;
        }
        aiComponent.getBlackboard().put("threat", threat);


    }




    /**
     * Moves the drone smoothly to a destination
     * @param phys The Physics Component of the drone
     * @param destination The desired destination
     */
    private void moveToDestination(PhysicsComponent phys, Vector2 destination){
        Vector2 speed = phys.getAcceleration();
        Vector2 distance = new Vector2(2,2); //TODO Constant

        float dX = (destination.x - phys.getPosition().x + distance.x)
                * speed.x * Gdx.graphics.getDeltaTime();
        float dY = (destination.y - phys.getPosition().y + distance.y)
                * speed.y * Gdx.graphics.getDeltaTime();

        phys.getBody().setLinearVelocity(new Vector2(dX, dY));
    }





}