package com.brm.Kubotz.Features.LaserGuns.Scripts;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.Kubotz.Common.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Common.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Common.Events.CollisionEvent;

/**
 * Used to handle visual apsects of bullets
 */
public class BulletGraphicsScript extends EntityScript {


    @Override
    public void onInit(Entity entity,  EntityManager entityManager){
        SpriterAnimationComponent anim;
        anim = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);

        anim.setAnimation("default");
    }


    @Override
    public void onCollision(CollisionEvent contact, Entity entity) {
        addSmokeEffect(entity);
    }

    @Override
    public void onUpdate(Entity entity, EntityManager entityManager){}


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
