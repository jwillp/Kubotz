package com.brm.Kubotz.Scripts.AI;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.AIComponent;

import java.util.ArrayList;

/**
 * AI Behaviour for Drones
 * No behaviour tree. (Overkill)
 */
public class DroneBehaviourScript extends EntityScript {
    @Override
    public void onInit(Entity entity, EntityManager manager) {

    }

    @Override
    public void onUpdate(Entity entity, EntityManager manager) {

        PhysicsComponent dronePhys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        AIComponent aiComponent = (AIComponent)entity.getComponent(AIComponent.ID);

        Entity master = manager.getEntity((String)aiComponent.getBlackboard().get("master"));
        PhysicsComponent masterPhys = (PhysicsComponent) master.getComponent(PhysicsComponent.ID);

        // Find closest enemy to the Master within a radius
        Logger.log("FIND ENEMY");

        // Move closer to that enemy

        //Shoot (Make sure at the moment of shooting the bullet wont hurt the player)


        //if no enemy in sight follow player
        Vector2 speed = dronePhys.getAcceleration();
        Vector2 distance =(Vector2) aiComponent.getBlackboard().get("minMasterDistance");

        float posX = (masterPhys.getPosition().x - dronePhys.getPosition().x + distance.x)
                * speed.x * Gdx.graphics.getDeltaTime();
        float posY = (masterPhys.getPosition().y - dronePhys.getPosition().y + distance.y)
                * speed.y * Gdx.graphics.getDeltaTime();

        dronePhys.getBody().setLinearVelocity(new Vector2(posX, posY));


    }


    @Override
    public void onCollision(EntityContact contact) {

    }



    private void moveCloserToEnnemy(Vector2 ennemyPosition){

    }





}
