package com.brm.Kubotz.Features.LaserGuns.Scripts;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ScriptingEngine.EntityScript;
import com.brm.GoatEngine.ECS.common.ParticleEffectComponent;
import com.brm.GoatEngine.ECS.common.SpriteComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Common.Events.CollisionEvent;

/**
 * Used to handle visual apsects of bullets
 */
public class BulletGraphicsScript extends EntityScript {


    @Override
    public void onInit(Entity entity,  EntityManager entityManager){

    }


    @Override
    public void onCollision(CollisionEvent contact, Entity entity) {
        addSmokeEffect(entity);
        entity.disableComponent(SpriteComponent.ID);
    }

    @Override
    public void onUpdate(Entity entity, EntityManager entityManager){

        SpriteComponent sprite = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

        //RIGHT
        if(phys.getVelocity().x > 0){
            sprite.getCurrentSprite().flip(true, false);
        }

    }


    /**
     * Adds a particle effect looking like Smoke
     * @param bullet
     */
    private void addSmokeEffect(Entity bullet){
        PhysicsComponent phys = (PhysicsComponent) bullet.getComponent(PhysicsComponent.ID);
        ParticleEffectComponent pe = (ParticleEffectComponent) bullet.getComponent(ParticleEffectComponent.ID);
        // New Smoke effect



        if(pe.getEffects().size() <= 2){
            pe.addEffect(
                    Gdx.files.internal(Constants.PARTICLES_LASER_SMOKE),
                    phys.getPosition(),
                    true
            );
        }



    }

}
