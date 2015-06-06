package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.Kubotz.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Events.CollisionEvent;

/**
 * Used to handle visual apsects of bullets
 */
public class BulletGraphicsScript extends EntityScript {

    public static int lol = 0;

    @Override
    public void onInit(Entity entity) {
        //ooaddSmokeEffect(entity);

    }

    @Override
    public void onCollision(CollisionEvent contact) {
        addSmokeEffect(contact.getEntityA());
    }

    @Override
    public void onUpdate(Entity entity){}


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
                    Gdx.files.internal("particles/laserSmoke.pe"),
                    phys.getPosition(),
                    true
            );
        }



    }

}
